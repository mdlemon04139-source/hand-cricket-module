import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Play,
  Share2,
  Users,
} from 'lucide-react';
import {
  HandCricketClientState,
  LimitedOversPreset,
  MatchFormat,
} from '../../types/handCricket';
import { HAND_CRICKET_LIMITS } from '../../engine/handCricketEngine';
import { sound } from '../../utils/sound';

interface HandCricketWaitingRoomProps {
  roomState: HandCricketClientState;
  onToggleReady: () => void;
  onUpdateConfig: (config: {
    format: MatchFormat;
    overs: number | null;
    wicketsPerInnings: number;
  }) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
  errorMsg?: string | null;
}

export const HandCricketWaitingRoom: React.FC<HandCricketWaitingRoomProps> = ({
  roomState,
  onToggleReady,
  onUpdateConfig,
  onStartMatch,
  onLeaveRoom,
  errorMsg,
}) => {
  const [copied, setCopied] = useState(false);
  const isHost = roomState.hostId === roomState.myPlayerId;
  const me = roomState.players.find((p) => p.playerId === roomState.myPlayerId);
  const canStart =
    roomState.players.length === 2 &&
    roomState.players.every((p) => p.isReady);

  const handleCopyCode = async () => {
    sound.playClick();
    try {
      await navigator.clipboard.writeText(roomState.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleShareRoom = async () => {
    sound.playClick();
    const shareText = `Join my Hand Cricket room! Room Code: ${roomState.roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hand Cricket',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // fallback to copy
      }
    }
    handleCopyCode();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <button
          onClick={() => {
            sound.playClick();
            onLeaveRoom();
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Leave Room</span>
        </button>

        <h2 className="text-lg font-bold text-white">Waiting Room</h2>
      </div>

      {/* Room Code Panel */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 block">Room Code</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-3xl font-mono font-bold tracking-widest text-amber-400 tabular-nums">
              {roomState.roomCode}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              · {roomState.players.length}/2 Players
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyCode}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleShareRoom}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((seatIdx) => {
          const participant = roomState.players[seatIdx];
          if (!participant) {
            return (
              <div
                key={seatIdx}
                className="p-6 rounded-2xl bg-slate-900/50 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center min-h-[120px]"
              >
                <Users className="w-6 h-6 text-slate-600 mb-2" />
                <p className="text-sm font-medium text-slate-400">
                  Waiting for opponent...
                </p>
              </div>
            );
          }

          const isParticipantHost = participant.playerId === roomState.hostId;
          const isMe = participant.playerId === roomState.myPlayerId;

          return (
            <div
              key={participant.playerId}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                participant.isReady
                  ? 'bg-slate-900 border-emerald-500/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="relative w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                  <span>{participant.avatar}</span>
                  <span className="absolute -bottom-1 -right-1 px-1 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono font-bold text-[10px]">
                    #{participant.jerseyNumber}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-white">
                      {participant.name}
                    </h3>
                    {isMe && (
                      <span className="text-xs text-slate-400">(You)</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {participant.country} ·{' '}
                    {isParticipantHost ? 'Host' : 'Player'} ·{' '}
                    {participant.isOnline ? 'Online' : 'Reconnecting'}
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-semibold ${
                  participant.isReady ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {participant.isReady ? 'Ready' : 'Not Ready'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Match Settings */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Match Settings</h3>
          <span className="text-xs font-mono text-slate-300 tabular-nums">
            {roomState.config.format === 'test_match'
              ? 'Test Match · 4 Innings · 10 Wickets'
              : `${roomState.config.overs} Overs · ${roomState.config.wicketsPerInnings} Wickets`}
          </span>
        </div>

        {isHost && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Match Format
              </label>
              <select
                value={roomState.config.format}
                onChange={(e) => {
                  const fmt = e.target.value as MatchFormat;
                  onUpdateConfig({
                    format: fmt,
                    overs:
                      fmt === 'test_match' ? null : roomState.config.overs || 2,
                    wicketsPerInnings:
                      fmt === 'test_match'
                        ? 10
                        : roomState.config.wicketsPerInnings,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm"
              >
                <option value="limited_overs">Limited Overs</option>
                <option value="custom_match">Custom Match</option>
                <option value="test_match">Test Match</option>
              </select>
            </div>

            {roomState.config.format === 'limited_overs' && (
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">
                  Overs
                </label>
                <div className="flex items-center gap-1.5">
                  {HAND_CRICKET_LIMITS.LIMITED_OVERS_PRESETS.map(
                    (ov: LimitedOversPreset) => (
                      <button
                        key={ov}
                        type="button"
                        onClick={() =>
                          onUpdateConfig({
                            format: 'limited_overs',
                            overs: ov,
                            wicketsPerInnings:
                              roomState.config.wicketsPerInnings,
                          })
                        }
                        className={`flex-1 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          roomState.config.overs === ov
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-950 border border-slate-800 text-slate-300'
                        }`}
                      >
                        {ov} Ov
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {roomState.config.format === 'custom_match' && (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Overs (1–50)
                  </label>
                  <input
                    type="number"
                    min={HAND_CRICKET_LIMITS.MIN_CUSTOM_OVERS}
                    max={HAND_CRICKET_LIMITS.MAX_CUSTOM_OVERS}
                    value={roomState.config.overs || 3}
                    onChange={(e) =>
                      onUpdateConfig({
                        format: 'custom_match',
                        overs: Math.max(
                          1,
                          Math.min(50, Number(e.target.value) || 1)
                        ),
                        wicketsPerInnings: roomState.config.wicketsPerInnings,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Wickets (1–10)
                  </label>
                  <input
                    type="number"
                    min={HAND_CRICKET_LIMITS.MIN_WICKETS}
                    max={HAND_CRICKET_LIMITS.MAX_WICKETS}
                    value={roomState.config.wicketsPerInnings}
                    onChange={(e) =>
                      onUpdateConfig({
                        format: roomState.config.format,
                        overs: roomState.config.overs,
                        wicketsPerInnings: Math.max(
                          1,
                          Math.min(10, Number(e.target.value) || 1)
                        ),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs sm:text-sm">
          {errorMsg}
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          onClick={() => {
            sound.playClick();
            onToggleReady();
          }}
          className={`px-5 py-3 rounded-xl font-bold text-sm transition-colors cursor-pointer ${
            me?.isReady
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
          }`}
        >
          {me?.isReady ? 'Cancel Ready' : 'Ready'}
        </button>

        {isHost ? (
          <button
            onClick={() => {
              sound.playClick();
              onStartMatch();
            }}
            disabled={!canStart}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
              canStart
                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Match</span>
          </button>
        ) : (
          <div className="text-xs sm:text-sm text-slate-400 text-center">
            Waiting for host to start the match...
          </div>
        )}
      </div>
    </div>
  );
};
