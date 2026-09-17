"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * Распознавание речи браузером (Web Speech API).
 *
 * Работает в Chrome на Android — там распознаёт Google, бесплатно и без
 * ключей. Safari на iOS API не поддерживает, поэтому всё завязано на
 * `supported`: кнопку диктовки показываем только когда он `true`.
 *
 * Сеть нужна: звук уходит на сторону браузера, офлайн распознавание не
 * работает. Это осознанное ограничение — офлайн-канал записи мыслей решается
 * отдельно, не здесь.
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

interface SpeechRecognitionEventLike {
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
 * @param onFinal вызывается на каждый распознанный фрагмент — фрагментов за
 *   одну диктовку может быть несколько, движок режет речь по паузам.
 */
export function useSpeechRecognition(
  onFinal: (text: string) => void,
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
  // Через ref, чтобы пересоздание колбэка не перевешивало обработчики
  // распознавания. Присваиваем в эффекте: запись ref во время рендера ломает
  // ожидания React и ловится линтером.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

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
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          const trimmed = text.trim();
          if (trimmed) onFinalRef.current(trimmed);
        } else {
          pending += text;
        }
      }
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
