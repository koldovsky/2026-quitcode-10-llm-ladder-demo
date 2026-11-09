// Крок 3. Агент: модель сама вирішує, які інструменти викликати і в якому порядку.
import { generateText, tool, stepCountIs } from 'ai';
import { z } from 'zod';
import { model, whoAnswered } from './model.mjs';

// Вигадані дані. Інструменти лише ЧИТАЮТЬ: записати заявку може тільки людина.
const balances = { 'Олена Тестенко': { vacationDaysLeft: 14 } };
// Спрощений демо-список святкових днів 2026 року (не офіційний календар).
const holidays = { 2026: ['2026-01-01', '2026-03-08', '2026-05-01', '2026-06-28', '2026-08-24', '2026-12-25'] };

const tools = {
  getLeaveBalance: tool({
    description: 'Скільки днів відпустки лишилось у працівника',
    inputSchema: z.object({ employee: z.string().describe("Ім'я та прізвище") }),
    execute: async ({ employee }) => balances[employee] ?? { error: 'Такої людини немає в демо-даних' },
  }),
  listHolidays: tool({
    description: 'Список святкових (неробочих) днів за рік',
    inputSchema: z.object({ year: z.number().int() }),
    execute: async ({ year }) => holidays[year] ?? [],
  }),
  countWorkdays: tool({
    description: 'Кількість робочих днів (пн–пт без свят) між двома датами включно',
    inputSchema: z.object({ from: z.string().describe('YYYY-MM-DD'), to: z.string().describe('YYYY-MM-DD') }),
    execute: async ({ from, to }) => {
      const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
      if (!isDate(from) || !isDate(to)) return { error: 'Дати потрібні у форматі YYYY-MM-DD' };
      if (from > to) return { error: 'Перша дата пізніша за другу' };
      let workdays = 0;
      for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
        const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const holiday = (holidays[d.getUTCFullYear()] ?? []).includes(d.toISOString().slice(0, 10));
        if (!weekend && !holiday) workdays++;
      }
      return { workdays };
    },
  }),
};

const question = process.argv.slice(2).join(' ')
  || 'Я Олена Тестенко. Хочу у відпустку з 21 по 31 грудня 2026. Скільки це робочих днів і чи вистачить мені залишку?';
const started = Date.now();
const result = await generateText({
  model,
  tools,
  stopWhen: stepCountIs(6), // не більше 6 кроків
  instructions: 'Ти HR-агент школи. Факти бери тільки з інструментів; робочі дні рахуй інструментом countWorkdays, а не сам. '
    + 'Ти лише читаєш дані: подати заявку може тільки людина. Відповідай коротко українською, звичайним текстом без Markdown.',
  prompt: question,
});

console.log(`Питання: ${question}\n`);
result.steps.forEach((step, i) => {
  if (step.toolCalls.length === 0) console.log(`крок ${i + 1} → відповідь без інструментів`);
  for (const call of step.toolCalls) {
    const res = step.toolResults.find((r) => r.toolCallId === call.toolCallId);
    console.log(`крок ${i + 1} → інструмент ${call.toolName}(${JSON.stringify(call.input)}) → ${JSON.stringify(res?.output)}`);
  }
});
console.log(`\nВідповідь агента:\n${result.text}`);
console.log(`\nКроків: ${result.steps.length} | Модель: ${whoAnswered(result)} | ${Date.now() - started} мс`);
