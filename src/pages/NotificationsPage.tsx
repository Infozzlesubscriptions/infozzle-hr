import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, messageFromError } from '../lib/api'
import type { Notification, Paginated } from '../lib/types'
import { getList } from '../lib/types'
import { EmptyState, ErrorState, formatDateTime, PageHeader, Spinner } from '../components/ui'

export function NotificationsPage() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const query = useQuery({ queryKey: ['notifications'], queryFn: () => api.get<Paginated<Notification> | Notification[]>('/notifications').then(r => getList(r.data)) })
  const read = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}`, { read: true }), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) })
  const readAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: () => client.invalidateQueries({ queryKey: ['notifications'] }) })
  const open = (item: Notification) => { if (!item.read) read.mutate(item.id); if (item.link) navigate(item.link) }
  return <><PageHeader eyebrow="Inbox" title="Notifications" actions={<button className="btn-secondary" onClick={() => readAll.mutate()} disabled={readAll.isPending}><CheckCheck className="size-4" /> Mark all read</button>} />
    <div className="card overflow-hidden">{query.isLoading ? <Spinner /> : query.isError ? <div className="p-4"><ErrorState message={messageFromError(query.error)} retry={() => query.refetch()} /></div> : !query.data?.length ? <EmptyState title="You're all caught up" message="Updates and approvals will appear here." /> : query.data.map(item => <button key={item.id} onClick={() => open(item)} className={`flex w-full items-start gap-4 border-b border-black/6 p-5 text-left last:border-0 hover:bg-mint/20 ${item.read ? 'opacity-60' : ''}`}><span className={`mt-1 rounded-xl p-2.5 ${item.read ? 'bg-black/5' : 'bg-mint text-forest'}`}><Bell className="size-4" /></span><div className="flex-1"><div className="flex items-center gap-2"><p className="font-semibold">{item.title}</p>{!item.read && <span className="size-2 rounded-full bg-clay" />}</div><p className="mt-1 text-sm text-black/50">{item.message}</p><p className="mt-2 text-xs text-black/35">{formatDateTime(item.createdAt)}</p></div></button>)}</div>
  </>
}
