import { Navigate } from 'react-router-dom';
import { useSmartContract } from '../hooks';
import { useEffect, useState } from 'react';

export default function ProtectedAdminRoute({ children }) {
  const { contract, signer } = useSmartContract();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!contract || !signer) {
        setLoading(false);
        return;
      }

      try {
        const address = await signer.getAddress();
        const owner = await contract.owner();
        setIsAdmin(address.toLowerCase() === owner.toLowerCase());
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [contract, signer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
} 