/**
 * Регрессия на раздувание надиктованного текста (18.09).
 *
 * Движок распознавания присылает не новые фрагменты, а всю фразу заново на
 * каждом уточнении, помечая её `isFinal`. Пока `onresult` дописывал каждый
 * такой результат, «Привет такая вот идея надо записать всё» превратилось в
 * инбоксе в 508 символов нарастающих повторов.
 *
 * Запуск: npm run check:speech
 */
import {
  collectTranscript,
  type SpeechRecognitionEventLike,
} from "../src/lib/useSpeechRecognition";

/** Поток, снятый с реальной записи. */
const stream = [
  "Привет",
  "Привет",
  "Привет такая",
  "Привет такая вот",
  "Привет такая вот иде",
  "Привет такая вот идея",
  "Привет такая вот идея надо записать",
  "Привет такая вот идея надо записать всё",
  "Привет такая вот идея надо записать всё .",
  "Привет такая вот идея надо записать всё .",
];

const expected = "Привет такая вот идея надо записать всё .";

function makeEvent(text: string, isFinal: boolean): SpeechRecognitionEventLike {
  const result = { 0: { transcript: text }, isFinal, length: 1 };
  return {
    resultIndex: 0,
    results: { 0: result, length: 1 },
  } as unknown as SpeechRecognitionEventLike;
}

let failures = 0;

// Повторная отдача одной и той же фразы не должна накапливаться.
let collected = "";
for (const text of stream) {
  collected = collectTranscript(makeEvent(text, true)).final;
}
if (collected !== expected) {
  console.error("❌ финальный текст раздулся:", JSON.stringify(collected));
  failures++;
}

// Промежуточный результат в финальный текст попадать не должен.
const mixed = collectTranscript(makeEvent("Привет такая вот иде", false));
if (mixed.final !== "" || mixed.interim !== "Привет такая вот иде") {
  console.error("❌ interim просочился в final:", JSON.stringify(mixed));
  failures++;
}

if (failures > 0) process.exit(1);
console.log("✅ распознавание: повторы не накапливаются, interim отделён");
