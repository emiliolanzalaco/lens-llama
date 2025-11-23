'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { UploadForm } from '@/components/upload-form';

export default function UploadPage() {
  const { ready, authenticated, login } = useAuth();

  if (!ready) {
    return (
      <div className="px-6 py-12 md:px-12">
        <div className="max-w-xl mx-auto">
          <div className="h-8 w-48 bg-[#FDF6E3] mb-8" />
          <div className="space-y-6">
            <div className="h-48 bg-[#FDF6E3]" />
            <div className="h-12 bg-[#FDF6E3]" />
            <div className="h-12 bg-[#FDF6E3]" />
            <div className="h-12 bg-[#FDF6E3]" />
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="px-6 py-12 md:px-12">
        <div className="max-w-xl mx-auto text-center py-24">
          <h1 className="text-3xl font-medium text-neutral-950 mb-4">
            Sign in to Upload
          </h1>
          <p className="text-neutral-600 mb-8">
            You need to be signed in to upload images to LensLlama.
          </p>
          <Button onClick={login}>Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 md:px-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-medium text-neutral-950 mb-8">
          Upload Image
        </h1>
        <UploadForm />
      </div>
    </div>
  );
}
