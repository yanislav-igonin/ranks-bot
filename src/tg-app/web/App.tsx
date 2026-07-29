import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppState, FixedUser, Rank } from '../contract.js';

export interface ApiClient {
  getState(): Promise<AppState>;
  assign(rankId: number, userId: number): Promise<AppState>;
}

export interface TelegramBridge {
  ready(): void;
  expand(): void;
  backButton: {
    show(): void;
    hide(): void;
    onClick(handler: () => void): void;
    offClick(handler: () => void): void;
  };
  haptic: {
    selectionChanged(): void;
    notificationOccurred(type: 'success' | 'error' | 'warning'): void;
  };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type View = 'list' | 'assign' | 'assigned';
type RequestStatus = 'loading' | 'ready' | 'error';

interface AppProps {
  api: ApiClient;
  telegram: TelegramBridge;
}

const RankGlyph = ({ index }: { index: number }) => (
  <span className="rank-index" aria-hidden="true">
    {String(index + 1).padStart(2, '0')}
  </span>
);

const AppHeader = ({
  eyebrow,
  title,
  count,
}: {
  eyebrow: string;
  title: string;
  count?: number;
}) => (
  <header className="app-header">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
    </div>
    {count !== undefined && (
      <span className="header-count" role="status" aria-label={`${count} званий`}>
        {String(count).padStart(2, '0')}
      </span>
    )}
  </header>
);

const PlayerMark = ({ user }: { user: FixedUser }) => (
  <span className={`player-mark player-mark-${user.id}`} aria-hidden="true">
    {user.initials}
  </span>
);

export const App = ({ api, telegram }: AppProps) => {
  const [status, setStatus] = useState<RequestStatus>('loading');
  const [data, setData] = useState<AppState | null>(null);
  const [view, setView] = useState<View>('list');
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setData(await api.getState());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [api]);

  useEffect(() => {
    telegram.ready();
    telegram.expand();
    let active = true;
    api
      .getState()
      .then((state) => {
        if (!active) return;
        setData(state);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [api, telegram]);

  const goHome = useCallback(() => {
    setSelectedRank(null);
    setView('list');
  }, []);

  useEffect(() => {
    if (view === 'list') {
      telegram.backButton.hide();
      return undefined;
    }

    telegram.backButton.show();
    telegram.backButton.onClick(goHome);
    return () => {
      telegram.backButton.offClick(goHome);
      telegram.backButton.hide();
    };
  }, [goHome, telegram, view]);

  const selectRank = (rank: Rank) => {
    telegram.haptic.selectionChanged();
    setToast(null);
    setSelectedRank(rank);
    setView('assign');
  };

  const assign = async (user: FixedUser) => {
    if (!selectedRank || isAssigning) return;

    setIsAssigning(true);
    setToast(null);
    try {
      const nextState = await api.assign(selectedRank.id, user.id);
      setData(nextState);
      telegram.haptic.notificationOccurred('success');
      setToast('Звание присвоено');
      goHome();
    } catch (error) {
      telegram.haptic.notificationOccurred('error');
      if (error instanceof ApiError && error.status === 409) {
        try {
          setData(await api.getState());
          setStatus('ready');
          setToast('Звание уже забрали');
          goHome();
        } catch {
          setStatus('error');
        }
      } else {
        setToast('Не удалось присвоить. Попробуй ещё раз');
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const totalAssigned = useMemo(
    () =>
      data?.assignedByUser.reduce((total, user) => total + user.ranks.length, 0) ??
      0,
    [data],
  );

  if (status === 'loading') {
    return (
      <main className="status-screen">
        <span className="loading-orbit" aria-hidden="true" />
        <p className="eyebrow">Ranks room</p>
        <h1>Загружаем звания</h1>
      </main>
    );
  }

  if (status === 'error' || !data) {
    return (
      <main className="status-screen">
        <span className="status-code">OFF</span>
        <p className="eyebrow">Связь потеряна</p>
        <h1>Не удалось загрузить</h1>
        <p className="status-copy">Проверь соединение и попробуй ещё раз.</p>
        <button className="primary-button" type="button" onClick={() => void load()}>
          Повторить
        </button>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />

      {view === 'list' && (
        <section className="screen screen-list">
          <AppHeader
            eyebrow="Розыгрыш · 3 игрока"
            title="Свободные звания"
            count={data.availableRanks.length}
          />

          {data.availableRanks.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                ✓
              </span>
              <h2>Всё разыграно</h2>
              <p>Свободных званий больше нет. История уже внизу.</p>
            </div>
          ) : (
            <div className="rank-list">
              {data.availableRanks.map((rank, index) => (
                <button
                  className="rank-row"
                  key={rank.id}
                  type="button"
                  onClick={() => selectRank(rank)}
                  style={
                    {
                      '--row-delay': `${Math.min(index, 10) * 28}ms`,
                    } as React.CSSProperties
                  }
                >
                  <RankGlyph index={index} />
                  <span className="rank-title">{rank.title}</span>
                  <span className="rank-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          )}

          <nav className="bottom-dock" aria-label="Навигация">
            <button
              className="dock-button"
              type="button"
              aria-label="Присвоенные звания"
              onClick={() => {
                telegram.haptic.selectionChanged();
                setView('assigned');
              }}
            >
              <span className="dock-icon" aria-hidden="true">
                ≡
              </span>
              <span>Присвоенные звания</span>
              <span className="dock-count">{totalAssigned}</span>
            </button>
          </nav>
        </section>
      )}

      {view === 'assign' && selectedRank && (
        <section className="screen screen-assign">
          <AppHeader eyebrow="Выбрано звание" title="Кому присвоить?" />

          <article className="selected-rank">
            <span className="selected-label">Звание #{selectedRank.id}</span>
            <h2>{selectedRank.title}</h2>
          </article>

          <div className="player-list">
            {data.users.map((user, index) => (
              <button
                className="player-row"
                key={user.id}
                type="button"
                disabled={isAssigning}
                aria-label={`Назначить ${user.displayName}`}
                onClick={() => void assign(user)}
                style={{ '--row-delay': `${index * 55}ms` } as React.CSSProperties}
              >
                <PlayerMark user={user} />
                <span className="player-copy">
                  <strong>{user.displayName}</strong>
                  <span>@{user.username}</span>
                </span>
                <span className="player-action" aria-hidden="true">
                  {isAssigning ? '···' : 'Выбрать'}
                </span>
              </button>
            ))}
          </div>

          <p className="assign-note">
            Одно нажатие — и звание навсегда уйдёт из свободных.
          </p>
        </section>
      )}

      {view === 'assigned' && (
        <section className="screen screen-assigned">
          <AppHeader
            eyebrow="Таблица игроков"
            title="Присвоенные"
            count={totalAssigned}
          />

          <div className="scoreboard">
            {data.assignedByUser.map((user, userIndex) => (
              <article
                className="score-card"
                key={user.id}
                style={
                  { '--row-delay': `${userIndex * 60}ms` } as React.CSSProperties
                }
              >
                <header className="score-header">
                  <PlayerMark user={user} />
                  <div>
                    <h2>{user.displayName}</h2>
                    <p>@{user.username}</p>
                  </div>
                  <span className="score-total">{user.ranks.length}</span>
                </header>

                {user.ranks.length === 0 ? (
                  <p className="score-empty">Пока пусто</p>
                ) : (
                  <ul className="assigned-list">
                    {user.ranks.map((rank) => (
                      <li key={`${user.id}-${rank.id}`}>
                        <span>{rank.title}</span>
                        {rank.count > 1 && <strong>×{rank.count}</strong>}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>

          <nav className="bottom-dock" aria-label="Навигация">
            <button className="dock-button" type="button" onClick={goHome}>
              <span className="dock-icon" aria-hidden="true">
                ←
              </span>
              <span>К розыгрышу</span>
              <span className="dock-count">{data.availableRanks.length}</span>
            </button>
          </nav>
        </section>
      )}

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span aria-hidden="true">●</span>
          {toast}
        </div>
      )}
    </main>
  );
};
