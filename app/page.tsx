'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedLoader from '@/components/AnimatedLoader';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return <AnimatedLoader fullScreen text="Loading Admin Portal..." />;
}
