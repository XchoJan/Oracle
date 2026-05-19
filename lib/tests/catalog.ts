import { FORECAST_PRICE_STARS } from "@/lib/pricing";
import {
  FREE_HEALTH_QUESTIONS,
  FREE_MONEY_QUESTIONS,
  FREE_RELATIONSHIPS_QUESTIONS,
  PAID_CAREER_QUESTIONS,
  PAID_MAP24_QUESTIONS,
  PAID_RELATIONS_QUESTIONS,
  PAID_STRESS_QUESTIONS,
} from "@/lib/tests/question-banks";
import {
  FREE_REPORT_INSTRUCTION,
  PAID_DEEP_REPORT_INSTRUCTION,
  PAID_MAP24_INSTRUCTION,
} from "@/lib/tests/schemas";
import type { ReportSpec, SurveyBlock, TestDefinition, TestId } from "@/lib/tests/types";

function blocks(chunk: number, titles: string[]): SurveyBlock[] {
  return titles.map((title, i) => ({
    title,
    from: i * chunk,
    to: (i + 1) * chunk,
  }));
}

const FREE_REPORT: ReportSpec = {
  minSections: 3,
  maxSections: 3,
  recsPerSection: 3,
  jsonInstruction: FREE_REPORT_INSTRUCTION,
};

const DEEP_REPORT: ReportSpec = {
  minSections: 5,
  maxSections: 5,
  recsPerSection: 4,
  jsonInstruction: PAID_DEEP_REPORT_INSTRUCTION,
};

const MAP24_REPORT: ReportSpec = {
  minSections: 7,
  maxSections: 9,
  recsPerSection: 6,
  jsonInstruction: PAID_MAP24_INSTRUCTION,
};

export const TEST_CATALOG: Record<TestId, TestDefinition> = {
  free_health: {
    id: "free_health",
    tier: "free",
    title: "Срез: здоровье и энергия",
    tagline: "12 вопросов · короткий разбор",
    durationHint: "~5 мин",
    priceStars: 0,
    introLine: "Поймёте, куда уходит ресурс тела и что тормозит восстановление.",
    resultTitle: "Мини-разбор: здоровье",
    questions: FREE_HEALTH_QUESTIONS,
    blocks: blocks(4, ["Сон и бодрость", "Тело и привычки", "Сигналы риска"]),
    report: FREE_REPORT,
    invoiceTitle: "",
    invoiceDescription: "",
  },
  free_money: {
    id: "free_money",
    tier: "free",
    title: "Срез: деньги и опора",
    tagline: "12 вопросов · короткий разбор",
    durationHint: "~5 мин",
    priceStars: 0,
    introLine: "Увидите слабые места в финансовой устойчивости без сложных таблиц.",
    resultTitle: "Мини-разбор: финансы",
    questions: FREE_MONEY_QUESTIONS,
    blocks: blocks(4, ["Доход и запас", "Долги и траты", "План на год"]),
    report: FREE_REPORT,
    invoiceTitle: "",
    invoiceDescription: "",
  },
  free_relationships: {
    id: "free_relationships",
    tier: "free",
    title: "Срез: отношения и границы",
    tagline: "12 вопросов · короткий разбор",
    durationHint: "~5 мин",
    priceStars: 0,
    introLine: "Проверите, где близость даёт опору, а где тянет вниз.",
    resultTitle: "Мини-разбор: отношения",
    questions: FREE_RELATIONSHIPS_QUESTIONS,
    blocks: blocks(4, ["Близость", "Конфликты", "Круг и границы"]),
    report: FREE_REPORT,
    invoiceTitle: "",
    invoiceDescription: "",
  },
  paid_map24: {
    id: "paid_map24",
    tier: "paid",
    title: "Прогностическая карта",
    tagline: "36 вопросов · горизонт 24 месяца",
    durationHint: "12–22 мин",
    priceStars: FORECAST_PRICE_STARS,
    introLine: "Полный протокол по всем зонам жизни — главный отчёт сервиса.",
    resultTitle: "Горизонт 24 месяца",
    questions: PAID_MAP24_QUESTIONS,
    blocks: [
      { title: "I — Тело и здоровье", from: 0, to: 6 },
      { title: "II — Работа и деньги", from: 6, to: 12 },
      { title: "III — Отношения", from: 12, to: 18 },
      { title: "IV — Стресс и опора", from: 18, to: 24 },
      { title: "V — Дела и быт", from: 24, to: 30 },
      { title: "VI — Планы и риски", from: 30, to: 36 },
    ],
    report: MAP24_REPORT,
    invoiceTitle: "Прогноз на 24 месяца",
    invoiceDescription: "Полный персональный разбор по протоколу самоотчёта",
  },
  paid_stress: {
    id: "paid_stress",
    tier: "paid",
    title: "Глубокий протокол: стресс",
    tagline: "24 вопроса · 12–24 месяца",
    durationHint: "~10 мин",
    priceStars: FORECAST_PRICE_STARS,
    introLine: "Детальный сценарий перегруза, тревоги и восстановления.",
    resultTitle: "Протокол стресса",
    questions: PAID_STRESS_QUESTIONS,
    blocks: blocks(6, ["Нагрузка", "Тело", "Регуляция", "Среда"]),
    report: DEEP_REPORT,
    invoiceTitle: "Протокол стресса",
    invoiceDescription: "Глубокий разбор стресса и регуляции",
  },
  paid_career: {
    id: "paid_career",
    tier: "paid",
    title: "Глубокий протокол: карьера",
    tagline: "24 вопроса · 12–24 месяца",
    durationHint: "~10 мин",
    priceStars: FORECAST_PRICE_STARS,
    introLine: "Траектория дохода, роста и профессиональных рисков.",
    resultTitle: "Протокол карьеры",
    questions: PAID_CAREER_QUESTIONS,
    blocks: blocks(6, ["Доход", "Навыки", "Рынок", "Риски"]),
    report: DEEP_REPORT,
    invoiceTitle: "Протокол карьеры",
    invoiceDescription: "Глубокий разбор работы и финансов",
  },
  paid_relations: {
    id: "paid_relations",
    tier: "paid",
    title: "Глубокий протокол: отношения",
    tagline: "24 вопроса · 12–24 месяца",
    durationHint: "~10 мин",
    priceStars: FORECAST_PRICE_STARS,
    introLine: "Сценарий близости, границ и социальной среды.",
    resultTitle: "Протокол отношений",
    questions: PAID_RELATIONS_QUESTIONS,
    blocks: blocks(6, ["Пара", "Границы", "Круг", "Динамика"]),
    report: DEEP_REPORT,
    invoiceTitle: "Протокол отношений",
    invoiceDescription: "Глубокий разбор отношений и границ",
  },
};

export const FREE_TESTS = (
  ["free_health", "free_money", "free_relationships"] as const
).map((id) => TEST_CATALOG[id]);

export const PAID_TESTS = (
  ["paid_map24", "paid_stress", "paid_career", "paid_relations"] as const
).map((id) => TEST_CATALOG[id]);

export function getTest(id: string): TestDefinition | null {
  return TEST_CATALOG[id as TestId] ?? null;
}

export function isTestId(id: string): id is TestId {
  return id in TEST_CATALOG;
}
