'use client';
import { useEffect, useState } from 'react';
import { request, type ParsedDocument } from '../lib/api';
import Dialog from './Dialog';
import { SourceLink } from './ExamDialog';
export default function DocumentDialog({ sourceId, token, close }: { sourceId: number; token: string; close: () => void }) {
  const [data, setData] = useState<ParsedDocument | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    request<ParsedDocument>(`/api/admin/sources/${sourceId}/document`, token, { signal: controller.signal }).then(setData).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [sourceId, token]);
  return <Dialog title="擷取原文" close={close}><h2>文件擷取原文</h2>{error ? <p role="alert">{error}</p> : !data ? <p role="status">讀取文件…</p> : <><SourceLink source={data.source} />{data.truncated && <p className="demo-notice">文件過長，以下只保留部分文字；請開啟原公告核對完整內容。</p>}{data.pages.length ? data.pages.map((page, index) => <details className="document-page" key={index} open={index === 0}><summary>{page.sheet || (page.page ? `第 ${page.page} 頁` : '公告文字')}</summary><pre>{page.text}</pre></details>) : <pre className="document-text">{data.text}</pre>}</>}</Dialog>;
}
