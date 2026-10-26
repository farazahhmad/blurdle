import { useRouter } from '../router/SimpleRouter';
import { Logo } from '../components/brand/Logo';

export default function NotFoundPage() {
  const { navigate } = useRouter();

  return (
    <div className="w-full max-w-md mx-auto py-24 px-4 text-center card p-8 flex flex-col items-center gap-4">
      <Logo variant="lockup" size={48} detail="full" animate className="mb-2" />
      <div className="font-mono text-xs uppercase tracking-mono-caps text-text-tertiary">
        404 / Scene Not Found
      </div>
      <h1 className="text-xl font-bold tracking-tight text-text-primary">
        Page Not Found
      </h1>
      <p className="text-xs font-mono text-text-secondary max-w-xs leading-relaxed">
        The requested screen does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate('/')}
        className="btn-primary mt-3 text-xs"
      >
        Return to Home Hub
      </button>
    </div>
  );
}
