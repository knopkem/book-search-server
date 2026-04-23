import { Alert, Avatar, Box, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import { apiRequest, ApiError } from '../../api/client';
import type { Book } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const books = await apiRequest<Book[]>('/api/books');
      setBookCount(books.length);
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <>
      <Stack spacing={3}>
        <Typography variant="h4">Settings</Typography>

        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar alt={user?.displayName} src={user?.avatarUrl ?? undefined} sx={{ width: 56, height: 56 }}>
                {user?.displayName?.slice(0, 1)}
              </Avatar>
              <Box>
                <Typography variant="h6">{user?.displayName}</Typography>
                <Typography color="text.secondary">{user?.email}</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Books stored: {bookCount ?? '...'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Snackbar
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        open={snackbar !== null}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? <Alert severity={snackbar.severity}>{snackbar.message}</Alert> : undefined}
      </Snackbar>
    </>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}
