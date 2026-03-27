'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePropertyType } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SetupForm({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState<'residential' | 'commercial'>('residential');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await savePropertyType({ orgId, orgName, propertyType });

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-20">
      <CardHeader>
        <CardTitle>Welcome to {orgName}</CardTitle>
        <CardDescription>
          Tell us about your properties to personalize your experience.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              What type of properties do you manage?
            </label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={propertyType === 'residential' ? 'default' : 'outline'}
                onClick={() => setPropertyType('residential')}
                className="flex-1"
              >
                Residential
              </Button>
              <Button
                type="button"
                variant={propertyType === 'commercial' ? 'default' : 'outline'}
                onClick={() => setPropertyType('commercial')}
                className="flex-1"
              >
                Commercial
              </Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Continue to Dashboard'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
