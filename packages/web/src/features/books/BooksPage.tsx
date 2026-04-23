import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  DataGrid,
  GridActionsCellItem,
  GridRowEditStopReasons,
  GridRowModes,
  type GridColDef,
  type GridEventListener,
  type GridRowId,
  type GridRowModesModel,
  type GridRowModel,
} from '@mui/x-data-grid';
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { apiRequest, ApiError } from '../../api/client';
import type { Book, CsvImportSummary } from '../../api/types';
import { emptyBookForm, normalizeBookForm, validateBookForm, type BookFormErrors, type BookFormValues } from './book-form';
import { filterBooks, type BookFilters } from './filter-books';

const emptyFilters: BookFilters = {
  author: '',
  title: '',
  remarks: '',
};

export function BooksPage() {
  const [rows, setRows] = useState<Book[]>([]);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [filters, setFilters] = useState<BookFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createValues, setCreateValues] = useState<BookFormValues>(emptyBookForm);
  const [createErrors, setCreateErrors] = useState<BookFormErrors>({});
  const [creating, setCreating] = useState(false);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const [deleteId, setDeleteId] = useState<GridRowId | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const books = await apiRequest<Book[]>('/api/books');
      setRows(books);
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBooks();
  }, []);

  const visibleRows = useMemo(() => filterBooks(rows, filters), [filters, rows]);

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleAdd = () => {
    setCreateValues(emptyBookForm);
    setCreateErrors({});
    setCreateDialogOpen(true);
  };

  const handleSave = (id: GridRowId) => () => {
    setRowModesModel((current) => ({ ...current, [id]: { mode: GridRowModes.View } }));
  };

  const handleEdit = (id: GridRowId) => () => {
    setRowModesModel((current) => ({ ...current, [id]: { mode: GridRowModes.Edit } }));
  };

  const handleCancel = (id: GridRowId) => () => {
    setRowModesModel((current) => ({
      ...current,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    }));
  };

  const handleDelete = (id: GridRowId) => () => {
    setDeleteId(id);
  };

  const updateCreateField = (field: keyof BookFormValues, value: string) => {
    setCreateValues((current) => ({ ...current, [field]: value }));
    setCreateErrors((current) => ({ ...current, [field]: undefined }));
  };

  const closeCreateDialog = () => {
    if (creating) {
      return;
    }

    setCreateDialogOpen(false);
    setCreateValues(emptyBookForm);
    setCreateErrors({});
  };

  const submitCreateDialog = async () => {
    const errors = validateBookForm(createValues);

    if (errors.name || errors.description) {
      setCreateErrors(errors);
      return;
    }

    setCreating(true);

    try {
      const book = await apiRequest<Book>('/api/books', {
        method: 'POST',
        body: JSON.stringify(normalizeBookForm(createValues)),
      });
      setRows((current) => [book, ...current]);
      setCreateDialogOpen(false);
      setCreateValues(emptyBookForm);
      setCreateErrors({});
      setSnackbar({ message: 'Book created.', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const processRowUpdate = async (newRow: GridRowModel) => {
    const payload = normalizeBookForm({
      name: String(newRow.name ?? ''),
      description: String(newRow.description ?? ''),
      remarks: String(newRow.remarks ?? ''),
    });
    const errors = validateBookForm(payload);

    if (errors.name || errors.description) {
      throw new Error(errors.name ?? errors.description);
    }

    const currentRow = rows.find((row) => row.id === newRow.id);

    if (!currentRow) {
      throw new Error('Book not found in local state.');
    }

    const savedRow = await apiRequest<Book>(`/api/books/${currentRow.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setSnackbar({ message: 'Book updated.', severity: 'success' });

    const updatedRow: Book = savedRow;
    setRows((current) => current.map((row) => (row.id === currentRow.id ? updatedRow : row)));

    return updatedRow;
  };

  const confirmDelete = async () => {
    if (!deleteId) {
      return;
    }

    try {
      await apiRequest<void>(`/api/books/${deleteId}`, { method: 'DELETE' });
      setRows((current) => current.filter((row) => row.id !== deleteId));
      setSnackbar({ message: 'Book deleted.', severity: 'success' });
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    } finally {
      setDeleteId(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const summary = await apiRequest<CsvImportSummary>('/api/books/import/csv', {
        method: 'POST',
        body: formData,
      });

      await loadBooks();
      setSnackbar({ message: formatImportSummary(summary), severity: 'success' });
    } catch (error) {
      setSnackbar({ message: getErrorMessage(error), severity: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const columns = useMemo<GridColDef<Book>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Author',
        flex: 1,
        editable: true,
        minWidth: 180,
      },
      {
        field: 'description',
        headerName: 'Title',
        flex: 1.2,
        editable: true,
        minWidth: 220,
      },
      {
        field: 'remarks',
        headerName: 'Remarks',
        flex: 1.8,
        editable: true,
        minWidth: 260,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Actions',
        width: 120,
        getActions: ({ id }) => {
          const isEditing = rowModesModel[id]?.mode === GridRowModes.Edit;

          if (isEditing) {
            return [
              <GridActionsCellItem icon={<SaveIcon />} label="Save" onClick={handleSave(id)} />,
              <GridActionsCellItem icon={<DeleteIcon />} label="Cancel" onClick={handleCancel(id)} />,
            ];
          }

          return [
            <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEdit(id)} />,
            <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDelete(id)} />,
          ];
        },
      },
    ],
    [rowModesModel],
  );

  return (
    <>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between">
          <Box>
            <Typography variant="h4">Books</Typography>
            <Typography color="text.secondary">Manage your reading list directly in the browser.</Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <input
              ref={fileInputRef}
              accept=".csv,text/csv"
              hidden
              onChange={(event) => {
                void handleImportSelected(event);
              }}
              type="file"
            />
            <Button
              onClick={handleImportClick}
              startIcon={<UploadFileIcon />}
              variant="outlined"
              disabled={importing}
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <Button onClick={handleAdd} startIcon={<AddIcon />} variant="contained">
              Add book
            </Button>
          </Stack>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Filter author"
              value={filters.author}
              onChange={(event) => setFilters((current) => ({ ...current, author: event.target.value }))}
            />
            <TextField
              fullWidth
              label="Filter title"
              value={filters.title}
              onChange={(event) => setFilters((current) => ({ ...current, title: event.target.value }))}
            />
            <TextField
              fullWidth
              label="Filter remarks"
              value={filters.remarks}
              onChange={(event) => setFilters((current) => ({ ...current, remarks: event.target.value }))}
            />
          </Stack>
        </Paper>

        <Paper sx={{ height: 620 }}>
          <DataGrid
            columns={columns}
            disableRowSelectionOnClick
            editMode="row"
            loading={loading}
            onProcessRowUpdateError={(error) =>
              setSnackbar({
                message: getErrorMessage(error),
                severity: 'error',
              })
            }
            onRowEditStop={handleRowEditStop}
            processRowUpdate={processRowUpdate}
            rowModesModel={rowModesModel}
            rows={visibleRows}
            onRowModesModelChange={setRowModesModel}
            initialState={{
              sorting: {
                sortModel: [{ field: 'name', sort: 'asc' }],
              },
            }}
          />
        </Paper>
      </Stack>

      <Dialog open={deleteId !== null} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete book?</DialogTitle>
        <DialogContent>
          <DialogContentText>This permanently removes the book from your reading list.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createDialogOpen} onClose={closeCreateDialog} fullWidth maxWidth="sm">
        <DialogTitle>Add book</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              fullWidth
              required
              label="Author"
              value={createValues.name}
              onChange={(event) => updateCreateField('name', event.target.value)}
              error={Boolean(createErrors.name)}
              helperText={createErrors.name}
            />
            <TextField
              fullWidth
              required
              label="Title"
              value={createValues.description}
              onChange={(event) => updateCreateField('description', event.target.value)}
              error={Boolean(createErrors.description)}
              helperText={createErrors.description}
            />
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Remarks"
              value={createValues.remarks}
              onChange={(event) => updateCreateField('remarks', event.target.value)}
              helperText="Optional"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCreateDialog} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={() => void submitCreateDialog()} variant="contained" disabled={creating}>
            {creating ? 'Saving...' : 'Create book'}
          </Button>
        </DialogActions>
      </Dialog>

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

function formatImportSummary(summary: CsvImportSummary) {
  return [
    `${summary.importedCount} imported`,
    `${summary.skippedExistingCount} kept existing`,
    `${summary.skippedDuplicateCount} skipped duplicate rows`,
  ].join(' · ');
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
