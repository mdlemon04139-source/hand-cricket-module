import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AIDifficulty,
  CareerAchievementDefinition,
  GestureVariationId,
  HandCricketClientState,
  HandNumber,
  MatchFormat,
  MatchMode,
  PlayerCareerData,
  TossCall,
  TossDecision,
} from '../../types/handCricket';
import { getPersistentGuestPlayerId } from '../utils/guestIdentity';
import { HandCricketHomeAndSetup } from './HandCricketHomeAndSetup';
import { HandCricketWaitingRoom } from './HandCricketWaitingRoom';
import { HandCricketTossScreen } from './HandCricketTossScreen';
import { HandCricketGameplayScreen } from './HandCricketGameplayScreen';
import { HandCricketResultScreen } from './HandCricketResultScreen';
import { CareerDashboardModal } from './CareerDashboardModal';
import { HandCricketRulesModal } from './HandCricketRulesModal';

interface HandCricketAppProps {
  onBackToKhelghor: () => void;
}

const ACTIVE_ROOM_STORAGE_KEY = 'khelghor_hc_active_room_v3';

export const HandCricketApp: React.FC<HandCricketAppProps> = ({
  onBackToKhelghor,
}) => {
  const [playerId] = useState<string>(() => getPersistentGuestPlayerId());
  const [career, setCareer] = useState<PlayerCareerData | null>(null);
  const [achievementsCatalog, setAchievementsCatalog] = useState<
    CareerAchievementDefinition[]
  >([]);
  const [stats, setStats] = useState<{
    totalPlays: number;
    totalUniquePlayers: number;
  }>({
    totalPlays: 0,
    totalUniquePlayers: 0,
  });

  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<HandCricketClientState | null>(
    null
  );
  const [joinError, setJoinError] = useState<string | null>(null);

  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isCareerOpen, setIsCareerOpen] = useState(false);
  const [careerSection, setCareerSection] = useState<
    'stats' | 'records' | 'achievements' | 'history' | 'leaderboard' | 'profile'
  >('stats');

  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchCareerAndStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/handcricket/career/${encodeURIComponent(playerId)}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.career) setCareer(data.career);
        if (data.achievementsCatalog)
          setAchievementsCatalog(data.achievementsCatalog);
        if (data.stats) setStats(data.stats);
      }
    } catch {
      // ignore offline error
    }
  }, [playerId]);

  const refreshRoomState = useCallback(
    async (targetRoomId?: string | null) => {
      const rid = targetRoomId || roomId;
      if (!rid) return;

      try {
        const res = await fetch(
          `/api/handcricket/rooms/${encodeURIComponent(
            rid
          )}/state?playerId=${encodeURIComponent(playerId)}`
        );
        if (res.ok) {
          const state: HandCricketClientState = await res.json();
          setRoomState(state);
          if (state.phase === 'MATCH_COMPLETE') {
            fetchCareerAndStats();
          }
        } else if (res.status === 404) {
          setRoomId(null);
          setRoomState(null);
          try {
            sessionStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore network glitch
      }
    },
    [roomId, playerId, fetchCareerAndStats]
  );

  // Initial load: fetch Career & check for active room reconnection
  useEffect(() => {
    fetchCareerAndStats();

    try {
      const savedRoomId = sessionStorage.getItem(ACTIVE_ROOM_STORAGE_KEY);
      if (savedRoomId) {
        fetch(`/api/handcricket/rooms/${encodeURIComponent(savedRoomId)}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.success && data.roomId && data.state) {
              setRoomId(data.roomId);
              setRoomState(data.state);
            } else {
              sessionStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
            }
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, [playerId, fetchCareerAndStats]);

  // Connect SSE stream when inside an active room
  useEffect(() => {
    if (!roomId) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    refreshRoomState(roomId);

    const sseUrl = `/api/handcricket/rooms/${encodeURIComponent(
      roomId
    )}/events?playerId=${encodeURIComponent(playerId)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data: HandCricketClientState = JSON.parse(event.data);
        setRoomState(data);
        if (data.phase === 'MATCH_COMPLETE') {
          fetchCareerAndStats();
        }
      } catch {
        // ignore parse error
      }
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [roomId, playerId, refreshRoomState, fetchCareerAndStats]);

  // Lightweight fallback sync for timer/reveal transitions
  useEffect(() => {
    if (!roomId) return;
    const interval = setInterval(() => {
      refreshRoomState(roomId);
    }, 1200);
    return () => clearInterval(interval);
  }, [roomId, refreshRoomState]);

  const handleUpdateProfile = async (updates: {
    name: string;
    country: string;
    jerseyNumber: number;
    avatar: string;
  }) => {
    const res = await fetch(
      `/api/handcricket/career/${encodeURIComponent(playerId)}/profile`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.career) setCareer(data.career);
    }
  };

  const handleCreateMatchOrRoom = async (params: {
    mode: MatchMode;
    format: MatchFormat;
    overs: number | null;
    wicketsPerInnings: number;
    aiDifficulty: AIDifficulty;
  }) => {
    setJoinError(null);
    const res = await fetch('/api/handcricket/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        name: career?.profile.name,
        country: career?.profile.country,
        jerseyNumber: career?.profile.jerseyNumber,
        avatar: career?.profile.avatar,
        ...params,
      }),
    });
    const data = await res.json();
    if (data.roomId && data.state) {
      setRoomId(data.roomId);
      setRoomState(data.state);
      try {
        sessionStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, data.roomId);
      } catch {
        // ignore
      }
      fetchCareerAndStats();
    }
  };

  const handleJoinRoom = async (roomCode: string) => {
    setJoinError(null);
    const res = await fetch(
      `/api/handcricket/rooms/${encodeURIComponent(roomCode)}/join`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          name: career?.profile.name,
          country: career?.profile.country,
          jerseyNumber: career?.profile.jerseyNumber,
          avatar: career?.profile.avatar,
        }),
      }
    );
    const data = await res.json();
    if (data.success && data.roomId && data.state) {
      setRoomId(data.roomId);
      setRoomState(data.state);
      try {
        sessionStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, data.roomId);
      } catch {
        // ignore
      }
    } else {
      setJoinError(data.error || 'Unable to join room.');
    }
  };

  const handleLeaveRoom = async () => {
    if (roomId) {
      try {
        await fetch(
          `/api/handcricket/rooms/${encodeURIComponent(roomId)}/leave`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
          }
        );
      } catch {
        // ignore
      }
    }
    setRoomId(null);
    setRoomState(null);
    try {
      sessionStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
    } catch {
      // ignore
    }
    fetchCareerAndStats();
  };

  const handleToggleReady = async () => {
    if (!roomId) return;
    const res = await fetch(
      `/api/handcricket/rooms/${encodeURIComponent(roomId)}/ready`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.state) setRoomState(data.state);
    }
  };

  const handleUpdateLobbyConfig = async (config: {
    format: MatchFormat;
    overs: number | null;
    wicketsPerInnings: number;
  }) => {
    if (!roomId) return;
    const res = await fetch(
      `/api/handcricket/rooms/${encodeURIComponent(roomId)}/config`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: playerId,
          ...config,
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.state) setRoomState(data.state);
    }
  };

  const handleStartMultiplayerMatch = async () => {
    if (!roomId) return;
    const res = await fetch(
      `/api/handcricket/rooms/${encodeURIComponent(roomId)}/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: playerId }),
      }
    );
    const data = await res.json();
    if (data.success && data.state) {
      setRoomState(data.state);
      fetchCareerAndStats();
    } else if (data.error) {
      setJoinError(data.error);
    }
  };

  const handleCallToss = useCallback(
    async (call: TossCall) => {
      if (!roomId) return;
      const res = await fetch(
        `/api/handcricket/rooms/${encodeURIComponent(roomId)}/toss-call`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, call }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.state) setRoomState(data.state);
      } else {
        refreshRoomState(roomId);
      }
    },
    [roomId, playerId, refreshRoomState]
  );

  const handleConfirmTossDecision = useCallback(
    async (decision: TossDecision) => {
      if (!roomId) return;
      const res = await fetch(
        `/api/handcricket/rooms/${encodeURIComponent(roomId)}/toss-decision`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, decision }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.state) setRoomState(data.state);
      } else {
        // If server already auto-confirmed AI's toss decision via processServerTick, sync immediately
        refreshRoomState(roomId);
      }
    },
    [roomId, playerId, refreshRoomState]
  );

  const handleSubmitBall = useCallback(
    async (choice: {
      number: HandNumber;
      gestureId: GestureVariationId;
      ballId: string;
    }) => {
      if (!roomId) return;
      const res = await fetch(
        `/api/handcricket/rooms/${encodeURIComponent(roomId)}/ball`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            ...choice,
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setRoomState(data.state);
          if (data.state.phase === 'MATCH_COMPLETE') {
            fetchCareerAndStats();
          }
        }
      } else {
        refreshRoomState(roomId);
      }
    },
    [roomId, playerId, fetchCareerAndStats, refreshRoomState]
  );

  const handleAdvanceBreak = useCallback(async () => {
    if (!roomId) return;
    const res = await fetch(
      `/api/handcricket/rooms/${encodeURIComponent(roomId)}/advance`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.state) setRoomState(data.state);
    }
  }, [roomId, playerId]);

  const handleVoteRematch = useCallback(async () => {
    if (!roomId) return;
    const res = await fetch(
      `/api/handcricket/rooms/${encodeURIComponent(roomId)}/rematch`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      if (data.state) {
        setRoomState(data.state);
        fetchCareerAndStats();
      }
    }
  }, [roomId, playerId, fetchCareerAndStats]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {!roomState ? (
        <HandCricketHomeAndSetup
          career={career}
          stats={stats}
          onBackToKhelghor={onBackToKhelghor}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenCareer={(sec = 'stats') => {
            setCareerSection(sec);
            setIsCareerOpen(true);
          }}
          onCreateMatchOrRoom={handleCreateMatchOrRoom}
          onJoinMultiplayerRoom={handleJoinRoom}
          joinError={joinError}
        />
      ) : roomState.phase === 'LOBBY' ? (
        <HandCricketWaitingRoom
          roomState={roomState}
          onToggleReady={handleToggleReady}
          onUpdateConfig={handleUpdateLobbyConfig}
          onStartMatch={handleStartMultiplayerMatch}
          onLeaveRoom={handleLeaveRoom}
          errorMsg={joinError}
        />
      ) : roomState.phase === 'TOSS_CALL' ||
        roomState.phase === 'TOSS_DECISION' ? (
        <HandCricketTossScreen
          roomState={roomState}
          onCallToss={handleCallToss}
          onConfirmDecision={handleConfirmTossDecision}
        />
      ) : roomState.phase === 'MATCH_COMPLETE' ? (
        <HandCricketResultScreen
          roomState={roomState}
          onPlayAgainNewMatch={handleLeaveRoom}
          onVoteRematch={handleVoteRematch}
          onReturnHome={handleLeaveRoom}
          onOpenCareer={() => {
            setCareerSection('stats');
            setIsCareerOpen(true);
          }}
        />
      ) : (
        <HandCricketGameplayScreen
          roomState={roomState}
          onSubmitBall={handleSubmitBall}
          onAdvanceBreak={handleAdvanceBreak}
          onLeaveMatch={handleLeaveRoom}
        />
      )}

      {/* Modals */}
      <CareerDashboardModal
        isOpen={isCareerOpen}
        onClose={() => setIsCareerOpen(false)}
        career={career}
        achievementsCatalog={achievementsCatalog}
        initialSection={careerSection}
        onUpdateProfile={handleUpdateProfile}
      />

      <HandCricketRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
      />
    </div>
  );
};
