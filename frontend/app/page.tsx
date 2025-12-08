import Image from "next/image";
import BackendTest from './components/backend-test';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="w-full max-w-[900px] scale-100">
          <BackendTest />
        <div>
        </div>
      </main>
    </div>
  );
}
