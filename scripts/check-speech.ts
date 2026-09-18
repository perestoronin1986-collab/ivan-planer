/**
 * Регрессии на склейку надиктованного текста (18.09).
 *
 * Движок кладёт в `event.results` не фрагменты речи, а нарастающие версии
 * одной фразы, помечая `isFinal` каждую. Пока их складывали, «Не забудьте
 * взять аренду с Радужного» превращалось в инбоксе в
 * «НеНеНеНеНе забудьтеНе забудьте взять…».
 *
 * Запуск: npm run check:speech
 */
import {
  collectTranscript,
  joinTranscript,
  type SpeechRecognitionEventLike,
} from "../src/lib/useSpeechRecognition";

function makeEvent(
  parts: { text: string; isFinal: boolean }[],
): SpeechRecognitionEventLike {
  const results: Record<number | string, unknown> = { length: parts.length };
  parts.forEach((part, i) => {
    results[i] = { 0: { transcript: part.text }, isFinal: part.isFinal, length: 1 };
  });
  return { resultIndex: 0, results } as unknown as SpeechRecognitionEventLike;
}

let failures = 0;
function check(name: string, actual: string, expected: string) {
  if (actual === expected) return;
  console.error(`❌ ${name}\n   ждали:   ${JSON.stringify(expected)}\n   пришло:  ${JSON.stringify(actual)}`);
  failures++;
}

// 1. Нарастающие версии одной фразы в одном событии — реальный поток с телефона.
const growing = ["Не", "Не", "Не", "Не забудьте", "Не забудьте взять", "Не забудьте взять аренду с Радужного"];
check(
  "нарастающие версии схлопываются в последнюю",
  collectTranscript(makeEvent(growing.map((text) => ({ text, isFinal: true })))).final,
  "Не забудьте взять аренду с Радужного",
);

// 2. Движок может поправить регистр по ходу уточнения.
check(
  "регистр не мешает узнать ту же фразу",
  collectTranscript(makeEvent([
    { text: "не забудьте", isFinal: true },
    { text: "Не забудьте взять", isFinal: true },
  ])).final,
  "Не забудьте взять",
);

// 3. Поведение по спецификации: разные куски речи — их складываем.
check(
  "разные фразы складываются через пробел",
  collectTranscript(makeEvent([
    { text: "Не забудьте", isFinal: true },
    { text: "двадцатого числа", isFinal: true },
  ])).final,
  "Не забудьте двадцатого числа",
);

// 4. Повторная отдача той же фразы событие за событием не накапливается.
let last = "";
for (const text of ["Привет", "Привет такая", "Привет такая вот идея"]) {
  last = collectTranscript(makeEvent([{ text, isFinal: true }])).final;
}
check("повтор между событиями не накапливается", last, "Привет такая вот идея");

// 5. Промежуточный результат в финальный текст не течёт.
const mixed = collectTranscript(makeEvent([
  { text: "Не забудьте", isFinal: true },
  { text: "взя", isFinal: false },
]));
check("interim отделён от final", mixed.final, "Не забудьте");
check("interim собран", mixed.interim, "взя");

// 6. Склейка с текстом прошлых сессий: движок мог переотдать ту же фразу.
check(
  "перезапуск сессии не удваивает фразу",
  joinTranscript("Не забудьте взять", "Не забудьте взять аренду"),
  "Не забудьте взять аренду",
);
check(
  "новая фраза после перезапуска дописывается",
  joinTranscript("Не забудьте взять", "аренду с Радужного"),
  "Не забудьте взять аренду с Радужного",
);

if (failures > 0) process.exit(1);
console.log("✅ распознавание: версии схлопываются, куски складываются, interim отделён");
