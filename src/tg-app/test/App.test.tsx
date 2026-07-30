import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { type AppState, FIXED_USERS } from '../contract.js';
import { type ApiClient, ApiError, App, type TelegramBridge } from '../web/App.js';

const initialState: AppState = {
  availableRanks: [
    { id: 65, title: 'Кукурузный макрогол' },
    { id: 66, title: 'Обугленный' },
  ],
  users: FIXED_USERS,
  assignedByUser: FIXED_USERS.map((user) => ({
    ...user,
    ranks:
      user.id === 546166718
        ? [
            {
              assignmentId: 91,
              id: 1,
              title: 'Стоянов',
              comment: 'Сломал диван на вписке',
              count: 1,
              assignedAt: '2026-07-29T11:00:00.000Z',
            },
          ]
        : [],
  })),
};

const assignedState: AppState = {
  availableRanks: [{ id: 66, title: 'Обугленный' }],
  users: FIXED_USERS,
  assignedByUser: FIXED_USERS.map((user) => ({
    ...user,
    ranks:
      user.id === 546166718
        ? [
            {
              assignmentId: 92,
              id: 65,
              title: 'Кукурузный макрогол',
              comment: 'За лучший подгон',
              count: 1,
              assignedAt: '2026-07-29T12:00:00.000Z',
            },
            {
              assignmentId: 91,
              id: 1,
              title: 'Стоянов',
              comment: 'Сломал диван на вписке',
              count: 1,
              assignedAt: '2026-07-29T11:00:00.000Z',
            },
          ]
        : [],
  })),
};

const createApi = (overrides: Partial<ApiClient> = {}): ApiClient => ({
  getState: vi.fn().mockResolvedValue(initialState),
  assign: vi.fn().mockResolvedValue(assignedState),
  createRank: vi.fn().mockResolvedValue(initialState),
  deleteRank: vi.fn().mockResolvedValue({
    ...initialState,
    availableRanks: [initialState.availableRanks[1]],
  }),
  unassign: vi.fn().mockResolvedValue({
    ...initialState,
    assignedByUser: FIXED_USERS.map((user) => ({ ...user, ranks: [] })),
  }),
  ...overrides,
});

const createTelegram = () => {
  let backHandler: (() => void) | undefined;
  const telegram: TelegramBridge = {
    ready: vi.fn(),
    expand: vi.fn(),
    backButton: {
      show: vi.fn(),
      hide: vi.fn(),
      onClick: vi.fn((handler) => {
        backHandler = handler;
      }),
      offClick: vi.fn((handler) => {
        if (backHandler === handler) backHandler = undefined;
      }),
    },
    haptic: {
      selectionChanged: vi.fn(),
      notificationOccurred: vi.fn(),
    },
  };
  return {
    telegram,
    pressBack: () => backHandler?.(),
  };
};

describe('Telegram rank app screens', () => {
  it('loads and renders the available ranks', async () => {
    const api = createApi();
    const { telegram } = createTelegram();

    render(<App api={api} telegram={telegram} />);

    expect(screen.getByText('Загружаем звания')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', {
        name: /Кукурузный макрогол/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Обугленный/ })).toBeInTheDocument();
    expect(telegram.ready).toHaveBeenCalledOnce();
    expect(telegram.expand).toHaveBeenCalledOnce();
  });

  it('shows a useful empty state when every rank is assigned', async () => {
    render(
      <App
        api={createApi({
          getState: vi.fn().mockResolvedValue({
            ...initialState,
            availableRanks: [],
          }),
        })}
        telegram={createTelegram().telegram}
      />,
    );

    expect(await screen.findByText('Всё разыграно')).toBeInTheDocument();
  });

  it('shows assigned ranks grouped under all three friends', async () => {
    render(<App api={createApi()} telegram={createTelegram().telegram} />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Присвоенные звания',
      }),
    );

    expect(screen.getByRole('heading', { name: 'Присвоенные' })).toBeInTheDocument();
    expect(screen.getByText('@Noeter')).toBeInTheDocument();
    expect(screen.getByText('@hobo_with_a_hookah')).toBeInTheDocument();
    expect(screen.getByText('@ConeConundrum')).toBeInTheDocument();
    expect(screen.getByText('Стоянов')).toBeInTheDocument();
    expect(screen.getByText(/Сломал диван на вписке/)).toBeInTheDocument();
    expect(screen.getAllByText('Пока пусто')).toHaveLength(2);
  });

  it('retries after the initial request fails', async () => {
    const getState = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(initialState);
    render(
      <App api={createApi({ getState })} telegram={createTelegram().telegram} />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Кукурузный макрогол')).toBeInTheDocument();
    expect(getState).toHaveBeenCalledTimes(2);
  });
});

describe('rank assignment flow', () => {
  it('opens recipients and returns through Telegram Back Button', async () => {
    const bridge = createTelegram();
    render(<App api={createApi()} telegram={bridge.telegram} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Кукурузный макрогол/,
      }),
    );
    expect(
      screen.getByRole('heading', { name: 'Кому присвоить?' }),
    ).toBeInTheDocument();
    expect(bridge.telegram.backButton.show).toHaveBeenCalled();

    act(() => bridge.pressBack());

    expect(
      screen.getByRole('heading', { name: 'Свободные звания' }),
    ).toBeInTheDocument();
    expect(bridge.telegram.backButton.hide).toHaveBeenCalled();
  });

  it('confirms recipient and comment before assigning', async () => {
    const api = createApi();
    const bridge = createTelegram();
    render(<App api={api} telegram={bridge.telegram} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Кукурузный макрогол/,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Назначить Noeter/ }));
    expect(api.assign).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: 'Подтвердить присвоение' }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Комментарий'), {
      target: { value: '  За лучший подгон  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить присвоение' }));

    await waitFor(() => {
      expect(api.assign).toHaveBeenCalledWith(65, 546166718, 'За лучший подгон');
    });
    expect(await screen.findByText('Звание присвоено')).toBeInTheDocument();
    expect(screen.queryByText('Кукурузный макрогол')).not.toBeInTheDocument();
    expect(screen.getByText('Обугленный')).toBeInTheDocument();
    expect(bridge.telegram.haptic.notificationOccurred).toHaveBeenCalledWith(
      'success',
    );
  });

  it('disables every recipient while assignment is pending', async () => {
    let resolveAssignment: ((state: AppState) => void) | undefined;
    const assign = vi.fn(
      () =>
        new Promise<AppState>((resolve) => {
          resolveAssignment = resolve;
        }),
    );
    render(<App api={createApi({ assign })} telegram={createTelegram().telegram} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Кукурузный макрогол/,
      }),
    );
    const recipient = screen.getByRole('button', { name: /Назначить Noeter/ });
    fireEvent.click(recipient);
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить присвоение' }));
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить присвоение' }));

    expect(
      screen.getByRole('button', { name: 'Подтвердить присвоение' }),
    ).toBeDisabled();
    expect(assign).toHaveBeenCalledOnce();

    await act(async () => resolveAssignment?.(assignedState));
  });

  it('refreshes state and remains recoverable after an assignment conflict', async () => {
    const getState = vi
      .fn()
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce(assignedState);
    const api = createApi({
      getState,
      assign: vi
        .fn()
        .mockRejectedValue(new ApiError(409, 'Rank is already assigned')),
    });
    render(<App api={api} telegram={createTelegram().telegram} />);

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Кукурузный макрогол/,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Назначить Noeter/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Подтвердить присвоение' }));

    expect(await screen.findByText('Звание уже забрали')).toBeInTheDocument();
    expect(screen.getByText('Обугленный')).toBeInTheDocument();
    expect(getState).toHaveBeenCalledTimes(2);
  });
});

describe('rank management', () => {
  it('creates a rank from the management screen', async () => {
    const api = createApi();
    render(<App api={api} telegram={createTelegram().telegram} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Управление званиями' }),
    );
    fireEvent.change(screen.getByLabelText('Новое звание'), {
      target: { value: '  Повелитель тапок  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Добавить звание' }));

    await waitFor(() => {
      expect(api.createRank).toHaveBeenCalledWith('Повелитель тапок');
    });
    expect(await screen.findByText('Звание добавлено')).toBeInTheDocument();
  });

  it('confirms and deletes a free rank', async () => {
    const api = createApi();
    render(<App api={api} telegram={createTelegram().telegram} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Управление званиями' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Удалить Кукурузный макрогол' }),
    );
    expect(screen.getByRole('dialog', { name: 'Удалить звание?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить навсегда' }));

    await waitFor(() => expect(api.deleteRank).toHaveBeenCalledWith(65));
  });

  it('confirms and removes an existing assignment', async () => {
    const api = createApi();
    render(<App api={api} telegram={createTelegram().telegram} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Присвоенные звания' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Снять звание Стоянов' }));
    expect(screen.getByRole('dialog', { name: 'Снять звание?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Снять звание' }));

    await waitFor(() => expect(api.unassign).toHaveBeenCalledWith(91));
    expect(await screen.findByText('Звание снято')).toBeInTheDocument();
  });
});
