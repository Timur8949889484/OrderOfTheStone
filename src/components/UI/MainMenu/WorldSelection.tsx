import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../../utils/supabase";
import { MAP_SIZE } from "../../../utils/constants";
import type { World } from "./types";

interface WorldSelectionProps {
  session: any;
  onPlay: (world: World, isNew: boolean) => void;
  onLogout: () => void;
}

export function WorldSelection({
  session,
  onPlay,
  onLogout,
}: WorldSelectionProps) {
  const queryClient = useQueryClient();
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);

  // Состояния для модального окна создания мира
  const [isCreatingModalOpen, setIsCreatingModalOpen] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: worlds = [], isLoading: isLoadingWorlds } = useQuery({
    queryKey: ["worlds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("worlds")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as World[];
    },
    enabled: !!session,
  });

  const createWorldMutation = useMutation({
    mutationFn: async (name: string) => {
      const seed = Math.floor(Math.random() * 100000000).toString();
      const center = Math.floor(MAP_SIZE / 2);

      const { data, error } = await supabase
        .from("worlds")
        .insert([
          {
            name,
            seed,
            player_pos: { x: center, y: 25, z: center },
            time_of_day: 0,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      return data as World;
    },
    onSuccess: (newWorld) => {
      queryClient.invalidateQueries({ queryKey: ["worlds"] });
      setSelectedWorldId(newWorld.id);
      setIsCreatingModalOpen(false);
      setNewWorldName("");
      setCreateError(null);
      onPlay(newWorld, true);
    },
  });

  const deleteWorldMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("worlds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worlds"] });
      setSelectedWorldId(null);
    },
  });

  // Открытие модального окна создания мира
  const handleOpenCreateModal = () => {
    if (worlds.length >= 3) return;
    setCreateError(null);
    setNewWorldName("");
    setIsCreatingModalOpen(true);
  };

  // Проверка названия и создание
  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newWorldName.trim();

    if (!trimmedName) {
      setCreateError("Введите название мира");
      return;
    }

    // Проверка на дубликат названия (без учета регистра)
    const isDuplicate = worlds.some(
      (w) => w.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (isDuplicate) {
      setCreateError("Мир с таким названием уже существует!");
      return;
    }

    setCreateError(null);
    createWorldMutation.mutate(trimmedName);
  };

  const handleDeleteWorld = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Вы уверены, что хотите удалить мир "${name}"? Это действие необратимо.`,
      )
    ) {
      deleteWorldMutation.mutate(id);
    }
  };

  const handlePlayWorld = () => {
    const world = worlds.find((w) => w.id === selectedWorldId);
    if (!world) return;
    onPlay(world, false);
  };

  return (
    <>
      <h1 className="title">ВЫБОР МИРА</h1>

      {isCreatingModalOpen ? (
        /* Майнкрафт-форма для ввода названия мира */
        <form className="auth-form" onSubmit={handleConfirmCreate}>
          <div className="subtitle" style={{ marginBottom: "1rem" }}>
            НОВЫЙ МИР
          </div>

          <input
            type="text"
            className="mc-input"
            placeholder="Название мира..."
            value={newWorldName}
            maxLength={25}
            autoFocus
            onChange={(e) => {
              setNewWorldName(e.target.value);
              if (createError) setCreateError(null);
            }}
          />

          {createError && <p className="error-text">{createError}</p>}

          <div className="world-actions" style={{ marginTop: "15px" }}>
            <button
              type="submit"
              className="mc-button"
              disabled={!newWorldName.trim() || createWorldMutation.isPending}
            >
              {createWorldMutation.isPending ? "Создаем..." : "Создать"}
            </button>
            <button
              type="button"
              className="mc-button secondary"
              onClick={() => {
                setIsCreatingModalOpen(false);
                setCreateError(null);
              }}
            >
              Отмена
            </button>
          </div>
        </form>
      ) : (
        /* Обычный список миров */
        <>
          <div className="world-list">
            {isLoadingWorlds ? (
              <p>Загрузка миров...</p>
            ) : worlds.length === 0 ? (
              <p>У вас еще нет миров.</p>
            ) : (
              worlds.map((world) => (
                <div
                  key={world.id}
                  className={`world-item ${selectedWorldId === world.id ? "selected" : ""}`}
                  onClick={() => setSelectedWorldId(world.id)}
                >
                  <div>
                    <div className="world-name">{world.name}</div>
                    <div className="world-seed">Seed: {world.seed}</div>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => handleDeleteWorld(e, world.id, world.name)}
                    title="Удалить мир"
                  >
                    ✖
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="world-actions">
            <button
              className="mc-button"
              onClick={handlePlayWorld}
              disabled={!selectedWorldId}
            >
              Играть
            </button>
            <button
              className="mc-button"
              onClick={handleOpenCreateModal}
              disabled={worlds.length >= 3 || createWorldMutation.isPending}
            >
              Создать мир ({worlds.length}/3)
            </button>
            <button className="mc-button secondary" onClick={onLogout}>
              Выйти
            </button>
          </div>
        </>
      )}
    </>
  );
}
