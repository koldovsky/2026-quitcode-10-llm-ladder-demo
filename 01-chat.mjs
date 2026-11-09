// Крок 1. Чат: модель нічого не пам'ятає, тому ми щоразу надсилаємо всю історію.
import readline from 'node:readline';
import { generateText } from 'ai';
import { model, whoAnswered } from './model.mjs';

const instructions = 'Ти помічник відділу кадрів школи. Відповідай коротко (1–2 речення), українською.';
const messages = []; // історія розмови: user, assistant, user, assistant, ...
// Потрібно лише для запису демо (текст подано через |); на занятті ви пишете самі, і цей рядок нічого не змінює.
const piped = !process.stdin.isTTY;

console.log('Чат з HR-помічником. Порожній рядок або «вихід» — завершити.');
process.stdout.write('Ви: ');
for await (const line of readline.createInterface({ input: process.stdin })) {
  const text = line.trim();
  if (!text || text.toLowerCase() === 'вихід') break;
  if (piped) console.log(text); // показати поданий текст у записі

  messages.push({ role: 'user', content: text });
  console.log(`   (надсилаю моделі всю історію: ${messages.length} повідомл. + системну інструкцію)`);
  const result = await generateText({ model, instructions, messages });
  messages.push({ role: 'assistant', content: result.text });

  console.log(`HR-помічник: ${result.text}`);
  console.log(`   (модель: ${whoAnswered(result)})`);
  process.stdout.write('Ви: ');
}
console.log('\nДо зустрічі!');
process.exit(0);
