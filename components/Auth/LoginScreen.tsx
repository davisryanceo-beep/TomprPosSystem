
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../Shared/Input';
import Button from '../Shared/Button';
import { FaEye, FaEyeSlash, FaSignInAlt, FaCoffee, FaGoogle } from 'react-icons/fa';
import { useShop } from '../../contexts/ShopContext';


const LoginScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const { appSettings } = useShop();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const success = await login(username, password);
    if (!success) {
      setError('Invalid username or password. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream dark:bg-charcoal-900 p-4 fade-in">
      <div className="w-full max-w-sm bg-cream-light dark:bg-charcoal-dark shadow-2xl rounded-2xl p-8 space-y-8">
        <div className="text-center">
          <FaCoffee className="mx-auto h-20 w-20 text-emerald" />
          <h2 className="mt-6 text-3xl font-extrabold text-charcoal-dark dark:text-cream-light">
            Welcome Back!
          </h2>
          <p className="mt-2 text-base text-charcoal-light dark:text-charcoal-light">
            Sign in to start your shift
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            id="username"
            label="Username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g., cashier"
            required
            autoComplete="username"
          />
          <div>
            <Input
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              Icon={showPassword ? FaEyeSlash : FaEye}
              onClick={() => setShowPassword(!showPassword)}
            />
          </div>

          {error && <p className="text-sm text-terracotta text-center">{error}</p>}

          <Button type="submit" variant="primary" size="lg" className="w-full !py-4" disabled={isLoading} leftIcon={<FaSignInAlt />}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
        {appSettings.registrationEnabled && (
          <p className="text-center text-sm text-charcoal-light dark:text-charcoal-light">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => window.location.hash = '#/register'}
              className="font-medium text-emerald hover:text-emerald-dark underline bg-transparent border-none p-0 cursor-pointer"
            >
              Register here
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default LoginScreen;