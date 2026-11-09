// Крок 0. Найменший можливий виклик LLM: один запит → одна відповідь.
import { generateText } from 'ai';
import { model, whoAnswered } from './model.mjs';

const started = Date.now();
const result = await generateText({
  model,
  prompt: 'Поясни одним реченням, що таке LLM',
});

console.log(result.text);
console.log('---');
console.log(`Модель: ${whoAnswered(result)}`);
console.log(`Токени: на вході ${result.usage.inputTokens}, на виході ${result.usage.outputTokens}`);
console.log(`Час: ${Date.now() - started} мс`);
