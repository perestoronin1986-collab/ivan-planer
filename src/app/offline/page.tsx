export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Нет сети</h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Откроется как только появится интернет. Локальные изменения сохранятся
        и отправятся автоматически.
      </p>
      <a
        href="/"
        className="rounded-md bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
      >
        Попробовать снова
      </a>
    </main>
  );
}
