import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Helper fallback for parsing recipes without API key
function heuristicParseRecipe(rawText: string) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  let dishName = 'Imported Recipe';
  let servings = 4;
  const ingredients: Array<{ name: string; amount: number; unit: string }> = [];
  let notes = '';

  for (const line of lines) {
    const servingsMatch = line.match(/(?:servings?|yield|makes|portions?)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
    if (servingsMatch) {
      servings = parseFloat(servingsMatch[1]) || 4;
      continue;
    }

    if (!dishName || dishName === 'Imported Recipe') {
      if (!line.match(/^\d/) && !line.toLowerCase().includes('ingredient') && !line.toLowerCase().includes('instruction')) {
        dishName = line.replace(/^#+\s*/, '').slice(0, 60);
        continue;
      }
    }

    // Check for ingredient lines like "2 cups all-purpose flour" or "100g sugar" or "1 1/2 tsp salt"
    const ingMatch = line.match(/^[-*•]?\s*([\d\/\.\s¼½¾⅓⅔⅛]+)\s*([a-zA-Z]+)?\s+(?:of\s+)?(.+)$/i);
    if (ingMatch && ingredients.length < 5) {
      const amountStr = ingMatch[1].trim();
      let amount = 1;
      if (amountStr.includes('/')) {
        const parts = amountStr.split(/\s+/);
        let sum = 0;
        for (const p of parts) {
          if (p.includes('/')) {
            const [num, den] = p.split('/').map(Number);
            if (den) sum += num / den;
          } else {
            sum += parseFloat(p) || 0;
          }
        }
        amount = sum || 1;
      } else {
        amount = parseFloat(amountStr) || 1;
      }

      const unit = ingMatch[2] ? ingMatch[2].toLowerCase() : 'items';
      const name = ingMatch[3].trim().replace(/[.,;]$/, '');
      ingredients.push({ name, amount: Math.round(amount * 100) / 100, unit });
      continue;
    }

    if (line.toLowerCase().includes('bake') || line.toLowerCase().includes('cook') || line.toLowerCase().includes('min')) {
      notes += (notes ? ' ' : '') + line;
    }
  }

  // Ensure at least 3 ingredients
  while (ingredients.length < 3) {
    const defaults = [
      { name: 'Flour', amount: 2, unit: 'cups' },
      { name: 'Sugar', amount: 1, unit: 'cup' },
      { name: 'Butter', amount: 0.5, unit: 'cup' }
    ];
    ingredients.push(defaults[ingredients.length]);
  }

  return { dishName, servings, ingredients: ingredients.slice(0, 3), notes };
}

// Helper fallback for nutrition estimation
function heuristicNutrition(recipeContext: any) {
  const items = recipeContext?.items || recipeContext?.ingredients || [];
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const item of items) {
    const name = (item.name || '').toLowerCase();
    const amount = Number(item.scaledAmount || item.amount) || 1;
    const unit = (item.unit || '').toLowerCase();

    // Rough culinary calorie heuristics
    let factor = 100;
    if (name.includes('flour') || name.includes('pasta') || name.includes('rice') || name.includes('oats')) {
      totalCalories += amount * (unit.includes('cup') ? 450 : 3.6);
      totalCarbs += amount * (unit.includes('cup') ? 95 : 0.75);
      totalProtein += amount * (unit.includes('cup') ? 13 : 0.1);
      totalFiber += amount * (unit.includes('cup') ? 4 : 0.03);
    } else if (name.includes('sugar') || name.includes('honey') || name.includes('syrup')) {
      totalCalories += amount * (unit.includes('cup') ? 770 : 4);
      totalCarbs += amount * (unit.includes('cup') ? 200 : 1);
    } else if (name.includes('butter') || name.includes('oil') || name.includes('lard') || name.includes('ghee')) {
      totalCalories += amount * (unit.includes('cup') ? 1600 : 9);
      totalFat += amount * (unit.includes('cup') ? 180 : 1);
    } else if (name.includes('milk') || name.includes('cream')) {
      totalCalories += amount * (unit.includes('cup') ? 150 : 0.6);
      totalProtein += amount * (unit.includes('cup') ? 8 : 0.03);
      totalFat += amount * (unit.includes('cup') ? 8 : 0.03);
      totalCarbs += amount * (unit.includes('cup') ? 12 : 0.05);
    } else if (name.includes('egg')) {
      totalCalories += amount * 75;
      totalProtein += amount * 6;
      totalFat += amount * 5;
    } else if (name.includes('cheese')) {
      totalCalories += amount * (unit.includes('cup') ? 400 : 4);
      totalProtein += amount * (unit.includes('cup') ? 25 : 0.25);
      totalFat += amount * (unit.includes('cup') ? 32 : 0.32);
    } else {
      totalCalories += amount * 120;
      totalCarbs += amount * 15;
      totalProtein += amount * 4;
      totalFat += amount * 3;
    }
  }

  const servings = Number(recipeContext?.servingsWanted || recipeContext?.servingsOriginal) || 4;
  return {
    calories: Math.max(50, Math.round(totalCalories / servings)),
    protein: Math.max(1, Math.round(totalProtein / servings)),
    carbs: Math.max(1, Math.round(totalCarbs / servings)),
    fat: Math.max(1, Math.round(totalFat / servings)),
    fiber: Math.max(0, Math.round(totalFiber / servings)),
    summary: `Nutritional profile estimated per portion for ${servings} servings.`
  };
}

// 1. Chef AI Chat & Culinary Guidance Route
app.post('/api/chef-ai', async (req, res) => {
  try {
    const { message, recipeContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    const dish = recipeContext?.dishName || 'Custom Recipe';
    const sOriginal = recipeContext?.servingsOriginal || '?';
    const sWanted = recipeContext?.servingsWanted || '?';
    const multiplier = recipeContext?.multiplier || (Number(sWanted) && Number(sOriginal) ? (Number(sWanted) / Number(sOriginal)).toFixed(2) : '1');
    const ingredients = recipeContext?.ingredients || [];
    const notes = recipeContext?.notes || 'None';

    const ingredientsSummary = ingredients
      .filter((i: any) => i.name)
      .map((i: any) => `- ${i.name}: original ${i.amount || '-'} ${i.unit || ''} (scaled: ${i.scaledAmount || '-'} ${i.unit || ''})`)
      .join('\n');

    if (apiKey) {
      try {
        const ai = new GoogleGenAI();
        const prompt = `You are Chef Gemini, a friendly, professional Michelin-level culinary consultant built into Recipe Scaler Studio.
The user is working with this recipe:
- Dish: ${dish}
- Scaling: from ${sOriginal} servings to ${sWanted} servings (Multiplier: ${multiplier}x)
- Ingredients:
${ingredientsSummary || 'No ingredients entered yet'}
- Chef Notes: ${notes}

User Question/Request:
"${message}"

Instructions:
- Provide clear, expert culinary guidance.
- If asking about scaling effects, discuss how batch size impacts cooking temperature, pan crowding, searing, liquid evaporation, and baking times.
- If asking about substitutions or allergens, give exact ratio replacements and cooking nuances.
- Keep the tone encouraging, concise, practical, and formatted with clean bullet points or bold highlights.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        if (response.text) {
          return res.json({ reply: response.text });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to culinary rules:', geminiError?.message);
      }
    }

    // Intelligent culinary fallback
    let fallbackReply = `👨‍🍳 **Chef's Scaling Assessment for ${dish} (${multiplier}x scale):**\n\n`;
    const multNum = parseFloat(multiplier) || 1;
    if (multNum > 1.5) {
      fallbackReply += `• **Baking & Oven Time:** Do NOT automatically double baking time! If baking in multiple batches or separate pans, cooking time stays roughly the same. If using one larger, deeper baking dish, increase time by 20-30% and reduce oven temperature by 15°F-25°F to prevent outside burning before the center sets.\n`;
      fallbackReply += `• **Salt & Seasonings:** Start with **1.5x** salt, pepper, garlic, and pungent dried spices instead of the full ${multiplier}x. Seasoning compounds concentrate quickly; you can always add more to taste at the finish.\n`;
      fallbackReply += `• **Stovetop Liquids:** Liquid evaporation does not double linearly in wider skillets or dutch ovens. Watch your sauces closely in the final 10 minutes.\n`;
    } else if (multNum < 0.8) {
      fallbackReply += `• **Small Batch Cooking:** Baking in smaller or shallower pans leads to faster moisture evaporation. Check for doneness 5-10 minutes earlier than normal.\n`;
      fallbackReply += `• **Aromatics:** Herbs and aromatics scale down well 1:1, but keep at least a small pinch of leaveners (baking soda/powder) for reliable lift.\n`;
    } else {
      fallbackReply += `• **Standard Batch:** Your recipe is near 1:1 scale. Standard cooking temperatures and methods will work seamlessly.\n`;
    }

    if (message.toLowerCase().includes('substitut') || message.toLowerCase().includes('swap') || message.toLowerCase().includes('replace')) {
      fallbackReply += `\n**Top Substitution Rules:**\n- 1 Cup Buttermilk = 1 Cup Milk + 1 Tbsp Lemon Juice/Vinegar (rest 5 mins).\n- 1 Whole Egg (baking) = 1/4 Cup Unsweetened Applesauce or 1/4 Cup Silken Tofu.\n- 1 Tbsp Cornstarch = 2 Tbsp All-Purpose Flour.`;
    }

    res.json({ reply: fallbackReply });
  } catch (error: any) {
    console.error('Chef AI Error:', error);
    res.status(500).json({ error: error.message || 'An error occurred while contacting Chef AI.' });
  }
});

// 2. Advanced AI Recipe Auto-Parser (Extract structured data from raw text)
app.post('/api/parse-recipe', async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || !rawText.trim()) {
      return res.status(400).json({ error: 'Please provide recipe text to parse.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI();
        const prompt = `You are a culinary data extractor. Extract the dish name, original servings yield (as a positive number, default to 4 if unspecified), the top 3 primary ingredients (each with name, numerical amount, and unit), and any cooking instructions/notes from the following raw recipe text.

Raw Recipe Text:
"${rawText}"

Respond ONLY with valid JSON matching this schema:
{
  "dishName": "string",
  "servings": number,
  "ingredients": [
    { "name": "string", "amount": number, "unit": "string" }
  ],
  "notes": "string"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        const parsedData = JSON.parse(response.text || '{}');
        if (parsedData.dishName) {
          return res.json({ recipe: parsedData });
        }
      } catch (geminiError) {
        console.warn('Gemini parse failed, using heuristic parser:', geminiError);
      }
    }

    const fallbackParsed = heuristicParseRecipe(rawText);
    res.json({ recipe: fallbackParsed });
  } catch (error: any) {
    console.error('Parse Recipe Error:', error);
    res.status(500).json({ error: error.message || 'Failed to parse recipe text with AI.' });
  }
});

// 3. Advanced AI Nutrition Facts Estimator
app.post('/api/nutrition', async (req, res) => {
  try {
    const { recipeContext } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI();
        const prompt = `Estimate the nutritional facts PER SERVING for this recipe:
Dish: ${recipeContext?.dishName || 'Recipe'}
Yield: ${recipeContext?.servingsWanted || recipeContext?.servingsOriginal || 4} servings
Ingredients: ${JSON.stringify(recipeContext?.items || recipeContext?.ingredients || [])}

Respond ONLY with valid JSON matching this schema:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "summary": "string"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });

        const nutritionData = JSON.parse(response.text || '{}');
        if (nutritionData.calories) {
          return res.json({ nutrition: nutritionData });
        }
      } catch (geminiError) {
        console.warn('Gemini nutrition failed, using heuristic calculator:', geminiError);
      }
    }

    const fallbackNutrition = heuristicNutrition(recipeContext);
    res.json({ nutrition: fallbackNutrition });
  } catch (error: any) {
    console.error('Nutrition Error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate nutrition estimates.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, port: PORT, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Recipe Scaler Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
