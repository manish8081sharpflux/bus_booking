import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, LoaderCircleIcon, MoreVertical, RefreshCcw, Search } from 'lucide-react';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getUserById, listUsers, UserItem, UserRole } from '../services/users-api';

function roleVariant(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'destructive' as const;
    case 'OPERATOR':
      return 'warning' as const;
    default:
      return 'secondary' as const;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
}

export function UsersTable() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  async function loadUsers(currentSearch = '') {
    try {
      setIsLoading(true);
      setError(null);
      const result = await listUsers(currentSearch);
      setItems(result.items || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load users. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function onOpenView(id: string) {
    setIsViewOpen(true);
    setIsActionLoading(true);
    setError(null);

    try {
      const user = await getUserById(id);
      setSelectedUser(user);
    } catch (err) {
      setSelectedUser(null);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load user details. Please try again.',
      );
    } finally {
      setIsActionLoading(false);
    }
  }

  const emptyStateMessage = useMemo(() => {
    if (search.trim()) {
      return 'No users match your search.';
    }

    return 'No users found yet.';
  }, [search]);

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
        <CardTitle>Users</CardTitle>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Users"
              className="pl-9 md:w-64"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void loadUsers(search)}
            disabled={isLoading}
          >
            <RefreshCcw className="size-4" />
            Refresh
          </Button>
          <Button asChild>
            <Link to="/account/members/create-user">Add User</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert
            variant="destructive"
            appearance="light"
            className="mb-4"
            onClose={() => setError(null)}
          >
            <AlertIcon>
              <AlertCircle />
            </AlertIcon>
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                    <LoaderCircleIcon className="size-4 animate-spin" />
                    Loading users...
                  </div>
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {emptyStateMessage}
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.mobile}</TableCell>
                  <TableCell>{user.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(user.role)} appearance="light">
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => void onOpenView(user.id)}>
                          View
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View user information from auth service.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              {isActionLoading && !selectedUser ? (
                <div className="text-sm text-muted-foreground">Loading details...</div>
              ) : selectedUser ? (
                <div className="grid gap-3 text-sm">
                  <div><strong>Name:</strong> {selectedUser.name}</div>
                  <div><strong>Mobile:</strong> {selectedUser.mobile}</div>
                  <div><strong>Email:</strong> {selectedUser.email || '-'}</div>
                  <div>
                    <strong>Role:</strong>{' '}
                    <Badge variant={roleVariant(selectedUser.role)} appearance="light">
                      {selectedUser.role}
                    </Badge>
                  </div>
                  <div><strong>Created At:</strong> {formatDate(selectedUser.createdAt)}</div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No user selected.</div>
              )}
            </DialogBody>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
