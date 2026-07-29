import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FIXED_USERS, type AppState } from '../contract.js';
import {
  ApiError,
  App,
  type ApiClient,
  type TelegramBridge,
} from '../web/App.js';

const initialState: AppState = {
  availableRanks: [
    { id: 65, title: 'Кукурузный макрогол' },
    { id: 66, title: 'Обугленный' },
  ],
  users: FIXED_USERS,
  assignedByUser: FIXED_USERS.map((user) => ({
    ...user,
    ranks: user.id === 546166718
      ? [{ id: 1, title: 'Стоянов', count: 1 }]
      : [],
  })),
};

const assignedState: AppState = {
  availableRanks: [{ id: 66, title: 'Обугленный' }],
  users: FIXED_USERS,
  assignedByUser: FIXED_USERS.map((user) => ({
    ...user,
    ranks: user.id === 546166718
      ? [
        { id: 1, title: 'Стоянов', count: 1 },
        { id: 65, title: 'Кукурузный макрогол', count: 1 },
      ]
      : [],
  })),
};

const createApi = (overrides: Partial<ApiClient> = {}): ApiClient => ({
  getState: vi.fn().mockResolvedValue(initialState),
  assign: vi.fn().mockResolvedValue(assignedState),
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
    expect(await screen.findByRole('button', {
      name: /Кукурузный макрогол/,
    })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Обугленный/ }))
      .toBeInTheDocument();
    expect(telegram.ready).toHaveBeenCalledOnce();
    expect(telegram.expand).toHaveBeenCalledOnce();
  });

  it('shows a useful empty state when every rank is assigned', async () => {
    render(<App
      api={createApi({
        getState: vi.fn().mockResolvedValue({
          ...initialState,
          availableRanks: [],
        }),
      })}
      telegram={createTelegram().telegram}
    />);

    expect(await screen.findByText('Всё разыграно')).toBeInTheDocument();
  });

  it('shows assigned ranks grouped under all three friends', async () => {
    render(<App api={createApi()} telegram={createTelegram().telegram} />);
    fireEvent.click(await screen.findByRole('button', {
      name: 'Присвоенные звания',
    }));

    expect(screen.getByRole('heading', { name: 'Присвоенные' }))
      .toBeInTheDocument();
    expect(screen.getByText('@Noeter')).toBeInTheDocument();
    expect(screen.getByText('@hobo_with_a_hookah')).toBeInTheDocument();
    expect(screen.getByText('@ConeConundrum')).toBeInTheDocument();
    expect(screen.getByText('Стоянов')).toBeInTheDocument();
    expect(screen.getAllByText('Пока пусто')).toHaveLength(2);
  });

  it('retries after the initial request fails', async () => {
    const getState = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(initialState);
    render(<App
      api={createApi({ getState })}
      telegram={createTelegram().telegram}
    />);

    fireEvent.click(await screen.findByRole('button', { name: 'Повторить' }));

    expect(await screen.findByText('Кукурузный макрогол'))
      .toBeInTheDocument();
    expect(getState).toHaveBeenCalledTimes(2);
  });
});

describe('rank assignment flow', () => {
  it('opens recipients and returns through Telegram Back Button', async () => {
    const bridge = createTelegram();
    render(<App api={createApi()} telegram={bridge.telegram} />);

    fireEvent.click(await screen.findByRole('button', {
      name: /Кукурузный макрогол/,
    }));
    expect(screen.getByRole('heading', { name: 'Кому присвоить?' }))
      .toBeInTheDocument();
    expect(bridge.telegram.backButton.show).toHaveBeenCalled();

    act(() => bridge.pressBack());

    expect(screen.getByRole('heading', { name: 'Свободные звания' }))
      .toBeInTheDocument();
    expect(bridge.telegram.backButton.hide).toHaveBeenCalled();
  });

  it('assigns once, gives haptic feedback, and returns to refreshed ranks', async () => {
    const api = createApi();
    const bridge = createTelegram();
    render(<App api={api} telegram={bridge.telegram} />);

    fireEvent.click(await screen.findByRole('button', {
      name: /Кукурузный макрогол/,
    }));
    fireEvent.click(screen.getByRole('button', { name: /Назначить Noeter/ }));

    await waitFor(() => {
      expect(api.assign).toHaveBeenCalledWith(65, 546166718);
    });
    expect(await screen.findByText('Звание присвоено')).toBeInTheDocument();
    expect(screen.queryByText('Кукурузный макрогол')).not.toBeInTheDocument();
    expect(screen.getByText('Обугленный')).toBeInTheDocument();
    expect(bridge.telegram.haptic.notificationOccurred)
      .toHaveBeenCalledWith('success');
  });

  it('disables every recipient while assignment is pending', async () => {
    let resolveAssignment: ((state: AppState) => void) | undefined;
    const assign = vi.fn(() => new Promise<AppState>((resolve) => {
      resolveAssignment = resolve;
    }));
    render(<App
      api={createApi({ assign })}
      telegram={createTelegram().telegram}
    />);

    fireEvent.click(await screen.findByRole('button', {
      name: /Кукурузный макрогол/,
    }));
    const recipient = screen.getByRole('button', { name: /Назначить Noeter/ });
    fireEvent.click(recipient);
    fireEvent.click(recipient);

    expect(screen.getAllByRole('button', { name: /Назначить/ }))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ disabled: true }),
      ]));
    expect(assign).toHaveBeenCalledOnce();

    await act(async () => resolveAssignment?.(assignedState));
  });

  it('refreshes state and remains recoverable after an assignment conflict', async () => {
    const getState = vi.fn()
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce(assignedState);
    const api = createApi({
      getState,
      assign: vi.fn().mockRejectedValue(
        new ApiError(409, 'Rank is already assigned'),
      ),
    });
    render(<App api={api} telegram={createTelegram().telegram} />);

    fireEvent.click(await screen.findByRole('button', {
      name: /Кукурузный макрогол/,
    }));
    fireEvent.click(screen.getByRole('button', { name: /Назначить Noeter/ }));

    expect(await screen.findByText('Звание уже забрали')).toBeInTheDocument();
    expect(screen.getByText('Обугленный')).toBeInTheDocument();
    expect(getState).toHaveBeenCalledTimes(2);
  });
});
