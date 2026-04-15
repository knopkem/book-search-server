import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

import { apiRequest, ApiError } from '../../api/client';
import type { ApiToken, Book } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';

export function SettingsPage() {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [tokenName, setTokenName] = useState('Ionic mobile app');
  const [rawToken, setRawToken] = useState('');
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    try {
      const [tokenData, books] = await Promise.all([
        apiRequest<ApiToken[]>('/api/me/tokens'),
        apiRequest<Book[]>('/api/books'),
      ]);
      setTokens(tokenData);
      setBookCount(books.length);
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleGenerateToken = async () => {
    try {
      const response = await apiRequest<{ token: ApiToken; rawToken: string }>('/api/me/tokens', {
        method: 'POST',
        body: JSON.stringify({ name: tokenName }),
      });
      setRawToken(response.rawToken);
      setTokenName('Ionic mobile app');
      setTokens((current) => [response.token, ...current]);
      setSnackbar({ message: 'API token created.', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiRequest<void>(`/api/me/tokens/${id}`, { method: 'DELETE' });
      setTokens((current) => current.filter((token) => token.id !== id));
      setSnackbar({ message: 'API token revoked.', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    }
  };

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

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Box>
                <Typography variant="h6">Mobile API tokens</Typography>
                <Typography color="text.secondary">
                  Generate a token for the existing Ionic mobile app.
                </Typography>
              </Box>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  fullWidth
                  label="Token name"
                  value={tokenName}
                  onChange={(event) => setTokenName(event.target.value)}
                />
                <Button onClick={() => void handleGenerateToken()} variant="contained">
                  Generate token
                </Button>
              </Stack>

              {rawToken ? (
                <Alert
                  action={
                    <IconButton color="inherit" onClick={() => void navigator.clipboard.writeText(rawToken)}>
                      <ContentCopyIcon fontSize="inherit" />
                    </IconButton>
                  }
                  severity="warning"
                >
                  Save this token now — it is only shown once.
                  <Box component="code" sx={{ display: 'block', mt: 1, wordBreak: 'break-all' }}>
                    {rawToken}
                  </Box>
                </Alert>
              ) : null}

              <Divider />

              <List disablePadding>
                {tokens.map((token) => (
                  <ListItem
                    key={token.id}
                    divider
                    secondaryAction={
                      <IconButton edge="end" onClick={() => void handleRevoke(token.id)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar>{token.name.slice(0, 1).toUpperCase()}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={token.name}
                      secondary={`Preview: ${token.tokenPreview} • Created ${new Date(token.createdAt).toLocaleString()}${
                        token.lastUsedAt ? ` • Last used ${new Date(token.lastUsedAt).toLocaleString()}` : ''
                      }`}
                    />
                  </ListItem>
                ))}
                {tokens.length === 0 ? (
                  <ListItem>
                    <ListItemText primary="No API tokens yet." secondary="Create one for your phone." />
                  </ListItem>
                ) : null}
              </List>
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
