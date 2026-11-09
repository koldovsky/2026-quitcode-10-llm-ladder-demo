// Спільне налаштування для всіх кроків: ключ, модель, запасні моделі й зрозумілі помилки.
// Кожен скрипт імпортує звідси `model` і `whoAnswered`.
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('Не знайдено ключ OPENROUTER_API_KEY.');
  console.error('Створіть файл .env:  Copy-Item .env.example .env');
  console.error('Відкрийте його:      notepad .env');
  console.error('Вставте ключ з openrouter.ai → Keys у рядок OPENROUTER_API_KEY= і збережіть файл.');
  process.exit(1);
}

// Головна модель (можна змінити в .env) + запасні безкоштовні моделі.
export const primary = process.env.OPENROUTER_MODEL || 'nvidia/nemotron-3.5-super-vl:free';
const backups = [
  'nvidia/nemotron-3.5-super-vl:free',
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
];
// Ланцюжок: головна модель, потім запасні, без повторів (new Set прибирає дублікати).
// Беремо не більше 3 моделей, щоб у разі збоїв не чекати надто довго.
const chain = [...new Set([primary, ...backups])].slice(0, 3);

// models: якщо перша модель зайнята (429) чи недоступна, OpenRouter сам бере наступну.
export const model = createOpenRouter({ apiKey }).chat(primary, { models: chain });

// Хто насправді відповів (після запасного ланцюжка це може бути не головна модель).
export const whoAnswered = (result) => result.response.modelId;

// Коротке зрозуміле повідомлення про помилку замість довгого технічного звіту.
process.on('uncaughtException', (err) => {
  // Після повторних спроб SDK загортає помилку в іншу (RetryError); беремо останню справжню — lastError.
  const e = err.lastError ?? err;
  console.error(`Помилка${e.statusCode ? ` ${e.statusCode}` : ''}: ${e.message}`);
  if (e.statusCode === 401) console.error('Підказка: ключ неправильний або відкликаний. Перевірте рядок OPENROUTER_API_KEY у .env.');
  if (e.statusCode === 429 && /per-day/.test(e.message)) {
    console.error('Підказка: вичерпано денний ліміт безкоштовних запитів цього ключа. Він оновлюється о 02:00 за Києвом.');
  } else if (e.statusCode === 429) {
    console.error('Підказка: безкоштовні моделі зараз перевантажені. Зачекайте 20–30 секунд і запустіть ще раз.');
  }
  process.exitCode = 1;
});
