"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Распознавание речи браузером (Web Speech API).
 *
 * Работает в Chrome на Android — там распознаёт Google, бесплатно и без
 * ключей. Safari на iOS API не поддерживает, поэтому всё завязано на
 * `supported`: кнопку диктовки показываем только когда он `true`.
 *
 * Сеть нужна: звук уходит на сторону браузера, офлайн распознавание не
 * работает.
 */

/** В lib.dom.d.ts (TS 5.9) есть только SpeechRecognitionResult* — сам
 *  SpeechRecognition и его события не объявлены, поэтому минимум описан тут. */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/** Поддержка за время жизни вкладки не меняется — подписываться не на что. */
const noopSubscribe = () => () => {};

function getConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function join(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  return `${left.trimEnd()} ${right}`;
}

/**
 * Полный текст сессии из `event.results`.
 *
 * Считаем **всё** с нулевого индекса, а не приращение от `resultIndex`, и
 * отдаём наружу состояние целиком. Это делает обработку идемпотентной:
 * движок волен переотдавать одну и ту же фразу сколько угодно раз.
 *
 * Дописывание «нового куска» здесь не работает: движок (проверено на живой
 * записи 18.09) присылает не фрагменты, а всю фразу заново на каждом
 * уточнении, помечая её `isFinal`. Дописывание превращало
 * «Привет такая вот идея» в 508 символов нарастающих повторов.
 */
export function collectTranscript(event: SpeechRecognitionEventLike): {
  final: string;
  interim: string;
} {
  let final = "";
  let interim = "";
  for (let i = 0; i < event.results.length; i++) {
    const result = event.results[i];
    const text = result[0]?.transcript ?? "";
    if (result.isFinal) final += text;
    else interim += text;
  }
  return { final: final.trim(), interim: interim.trim() };
}

export type SpeechState = {
  /** API доступен в этом браузере. */
  supported: boolean;
  /** Идёт запись. */
  listening: boolean;
  /** Текст, который движок ещё уточняет — показываем бледным. */
  interim: string;
  /** Человекочитаемая ошибка или null. */
  error: string | null;
  start: () => void;
  stop: () => void;
};

/**
 * @param onTranscript получает **весь** надиктованный текст, а не дописку.
 *   Вызывается на каждое уточнение, поэтому подписчик должен заменять
 *   предыдущее значение, а не складывать с ним.
 */
export function useSpeechRecognition(
  onTranscript: (fullText: string) => void,
): SpeechState {
  // Через useSyncExternalStore, а не useState+useEffect: на сервере всегда
  // false, иначе гидрация разойдётся с разметкой.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => getConstructor() !== null,
    () => false,
  );
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Отличает остановку по кнопке от самопроизвольной: на Android движок
  // закрывает сессию после паузы в речи, и её надо поднимать обратно.
  const wantListeningRef = useRef(false);
  // Движок обнуляет `results` на каждой новой сессии, поэтому текст
  // завершённых сессий копим отдельно и складываем с текущей.
  const committedRef = useRef("");
  const sessionRef = useRef("");
  // Через ref, чтобы пересоздание колбэка не перевешивало обработчики.
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  const start = useCallback(() => {
    const Ctor = getConstructor();
    if (!Ctor) {
      setError("Браузер не умеет распознавать речь");
      return;
    }
    if (wantListeningRef.current) return;

    const recognition = new Ctor();
    recognition.lang = "ru-RU";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const { final, interim: pending } = collectTranscript(event);
      sessionRef.current = final;
      onTranscriptRef.current(join(committedRef.current, final));
      setInterim(pending);
    };

    recognition.onerror = (event) => {
      // no-speech и aborted — рабочий шум движка, а не поломка: молчание в
      // паузе и наша же остановка по кнопке. Показывать их пользователю
      // значит мигать ошибкой на каждой паузе.
      if (event.error === "no-speech" || event.error === "aborted") return;
      if (event.error === "not-allowed") {
        setError("Нет доступа к микрофону — разреши его в настройках сайта");
      } else if (event.error === "network") {
        setError("Распознавание требует сети");
      } else {
        setError(`Ошибка распознавания: ${event.error}`);
      }
      wantListeningRef.current = false;
      setListening(false);
      setInterim("");
    };

    recognition.onend = () => {
      // Фиксируем текст сессии до возможного перезапуска — после него
      // `results` начнётся с нуля и несохранённое потерялось бы.
      committedRef.current = join(committedRef.current, sessionRef.current);
      sessionRef.current = "";
      setInterim("");

      if (!wantListeningRef.current) {
        setListening(false);
        return;
      }
      // Пауза в речи — поднимаем сессию обратно. Если движок откажет,
      // считаем диктовку законченной, иначе получим цикл перезапусков.
      try {
        recognition.start();
      } catch {
        wantListeningRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    wantListeningRef.current = true;
    committedRef.current = "";
    sessionRef.current = "";
    setError(null);
    setInterim("");
    try {
      recognition.start();
      setListening(true);
    } catch {
      wantListeningRef.current = false;
      setError("Не удалось запустить запись");
    }
  }, []);

  // Уход со страницы во время записи оставил бы микрофон включённым.
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, interim, error, start, stop };
}
