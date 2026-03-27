import Chat from './components/chat';

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-2rem)] items-center justify-center bg-transparent font-sans">
      <main className="w-full scale-100">
          <Chat />
        <div>
        </div>
      </main>
    </div>
  );
}
