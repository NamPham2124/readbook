import React from 'react';
import { ReaderContainer } from '@/components/reader/ReaderContainer';

export default function ReaderPage({ params }: { params: { id: string } }) {
  return <ReaderContainer bookId={params.id} />;
}
