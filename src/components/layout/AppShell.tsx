import Nav from '@/components/layout/Nav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      <Nav />
      <main
        className="flex-1 overflow-auto"
        style={{ paddingTop: 'var(--nav-h)' }}
      >
        {children}
      </main>
    </div>
  );
}
