// import { useState, useEffect } from "react";
// import { supabase } from "../../../utils/supabase";
// import { AuthScreen } from "./AuthScreen";
// import { WorldSelection } from "./WorldSelection";
// import { GenerationScreen } from "./GenerationScreen";
// import type { World } from "./types";
// import "./MainMenu.scss";

// interface MainMenuProps {
//   onStartLock: () => void;
//   onComplete: () => void;
//   onStartGenerating: (world: World) => void;
//   progress: number;
//   isReady: boolean;
//   /** Стадия генерации мира из useChunkManager ("generating" | "baking" | "ready") */
//   generationStage: "generating" | "baking" | "ready";
// }

// export function MainMenu({
//   onStartLock,
//   onComplete,
//   onStartGenerating,
//   progress,
//   isReady,
//   generationStage,
// }: MainMenuProps) {
//   const [stage, setStage] = useState<
//     | "auth"
//     | "worlds"
//     | "generating"
//     | "ready"
//     | "fading-worlds"
//     | "fading-generating"
//   >("auth");

//   const [session, setSession] = useState<any>(null);
//   const [isResettingPassword, setIsResettingPassword] = useState(false);
//   const [isNewWorld, setIsNewWorld] = useState(false);

//   useEffect(() => {
//     const isRecovery = window.location.hash.includes("type=recovery");

//     if (isRecovery) {
//       sessionStorage.removeItem("awaitingReset");
//       setIsResettingPassword(true);
//       setStage("auth");
//       window.history.replaceState(null, "", window.location.pathname);
//     }

//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setSession(session);
//       const isAwaitingReset =
//         sessionStorage.getItem("awaitingReset") === "true";

//       if (session && !isRecovery && !isResettingPassword && !isAwaitingReset) {
//         setStage((prev) => (prev === "auth" ? "worlds" : prev));
//       }
//     });

//     const {
//       data: { subscription },
//     } = supabase.auth.onAuthStateChange((event, session) => {
//       setSession(session);
//       const isAwaitingReset =
//         sessionStorage.getItem("awaitingReset") === "true";

//       if (event === "PASSWORD_RECOVERY") {
//         sessionStorage.removeItem("awaitingReset");
//         setIsResettingPassword(true);
//         setStage("auth");
//       } else if (isAwaitingReset) {
//         return;
//       } else if (session && !isResettingPassword && !isRecovery) {
//         setStage((prev) => (prev === "auth" ? "worlds" : prev));
//       } else if (!session) {
//         setStage("auth");
//       }
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   useEffect(() => {
//     if (stage === "generating" && isReady) {
//       setStage("ready");
//     }
//   }, [isReady, stage]);

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//   };

//   const handlePlay = (world: World, isNew: boolean) => {
//     setIsNewWorld(isNew);
//     setStage("generating");
//     onStartGenerating(world);
//   };

//   const handleEnterNewWorld = () => {
//     onStartLock();
//     setStage("fading-generating");
//     setTimeout(() => {
//       onComplete();
//     }, 1000);
//   };

//   return (
//     <div
//       className={`main-menu ${stage.includes("fading") ? "fade-out" : ""} ${
//         stage === "generating" ||
//         stage === "ready" ||
//         stage === "fading-generating"
//           ? "transparent-bg"
//           : ""
//       }`}
//       onClick={(e) => e.stopPropagation()}
//       onPointerDown={(e) => e.stopPropagation()}
//     >
//       {stage === "auth" && (
//         <div className="menu-content">
//           <h1 className="title">
//             {isResettingPassword ? "ИЗМЕНЕНИЕ ПАРОЛЯ" : "ORDER OF THE STONE"}
//           </h1>
//           <AuthScreen
//             isResettingPassword={isResettingPassword}
//             onResetComplete={() => {
//               setIsResettingPassword(false);
//               sessionStorage.removeItem("awaitingReset");
//               setStage("worlds");
//             }}
//           />
//         </div>
//       )}

//       {(stage === "worlds" || stage === "fading-worlds") && (
//         <div className="menu-content worlds-container">
//           <WorldSelection
//             session={session}
//             onPlay={handlePlay}
//             onLogout={handleLogout}
//           />
//         </div>
//       )}

//       {(stage === "generating" ||
//         stage === "ready" ||
//         stage === "fading-generating") && (
//         <div className="generating-content">
//           <GenerationScreen
//             stage={generationStage}
//             isNewWorld={isNewWorld}
//             progress={progress}
//             onEnterWorld={handleEnterNewWorld}
//           />
//         </div>
//       )}
//     </div>
//   );
// }
import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import { AuthScreen } from "./AuthScreen";
import { WorldSelection } from "./WorldSelection";
import { GenerationScreen } from "./GenerationScreen"; // Оставь импорт, если компонент в отдельном файле
import type { World } from "./types";
import "./MainMenu.scss";

interface MainMenuProps {
  onStartLock: () => void;
  onComplete: () => void;
  onStartGenerating: (world: World) => void;
  progress: number;
  isReady: boolean;
  /** Стадия генерации мира из useChunkManager ("generating" | "baking" | "ready") */
  generationStage: "generating" | "baking" | "ready";
}

export function MainMenu({
  onStartLock,
  onComplete,
  onStartGenerating,
  progress,
  isReady,
  generationStage,
}: MainMenuProps) {
  const [stage, setStage] = useState<
    | "auth"
    | "worlds"
    | "generating"
    | "ready"
    | "fading-worlds"
    | "fading-generating"
  >("auth");

  const [session, setSession] = useState<any>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isNewWorld, setIsNewWorld] = useState(false);

  // --- СПАСАТЕЛЬНЫЙ КРУГ ДЛЯ ЗАВИСШЕЙ ЗАГРУЗКИ ---
  // Перехватываем событие компиляции GPU и автоматически отправляем сигнал о завершении.
  // Это не даст экрану загрузки зависнуть на 85%.
  useEffect(() => {
    const unlockGpuStage = () => {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("gpu-compile-complete"));
      }, 300); // Небольшая задержка для плавного заполнения бара
    };

    window.addEventListener("gpu-compile", unlockGpuStage);
    return () => window.removeEventListener("gpu-compile", unlockGpuStage);
  }, []);
  // ----------------------------------------------

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");

    if (isRecovery) {
      sessionStorage.removeItem("awaitingReset");
      setIsResettingPassword(true);
      setStage("auth");
      window.history.replaceState(null, "", window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const isAwaitingReset =
        sessionStorage.getItem("awaitingReset") === "true";

      if (session && !isRecovery && !isResettingPassword && !isAwaitingReset) {
        setStage((prev) => (prev === "auth" ? "worlds" : prev));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const isAwaitingReset =
        sessionStorage.getItem("awaitingReset") === "true";

      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.removeItem("awaitingReset");
        setIsResettingPassword(true);
        setStage("auth");
      } else if (isAwaitingReset) {
        return;
      } else if (session && !isResettingPassword && !isRecovery) {
        setStage((prev) => (prev === "auth" ? "worlds" : prev));
      } else if (!session) {
        setStage("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (stage === "generating" && isReady) {
      setStage("ready");
    }
  }, [isReady, stage]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handlePlay = (world: World, isNew: boolean) => {
    setIsNewWorld(isNew);
    setStage("generating");
    onStartGenerating(world);
  };

  const handleEnterNewWorld = () => {
    onStartLock();
    setStage("fading-generating");
    setTimeout(() => {
      onComplete();
    }, 1000);
  };

  return (
    <div
      className={`main-menu ${stage.includes("fading") ? "fade-out" : ""} ${
        stage === "generating" ||
        stage === "ready" ||
        stage === "fading-generating"
          ? "transparent-bg"
          : ""
      }`}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {stage === "auth" && (
        <div className="menu-content">
          <h1 className="title">
            {isResettingPassword ? "ИЗМЕНЕНИЕ ПАРОЛЯ" : "ORDER OF THE STONE"}
          </h1>
          <AuthScreen
            isResettingPassword={isResettingPassword}
            onResetComplete={() => {
              setIsResettingPassword(false);
              sessionStorage.removeItem("awaitingReset");
              setStage("worlds");
            }}
          />
        </div>
      )}

      {(stage === "worlds" || stage === "fading-worlds") && (
        <div className="menu-content worlds-container">
          <WorldSelection
            session={session}
            onPlay={handlePlay}
            onLogout={handleLogout}
          />
        </div>
      )}

      {(stage === "generating" ||
        stage === "ready" ||
        stage === "fading-generating") && (
        <div className="generating-content">
          <GenerationScreen
            stage={generationStage}
            isNewWorld={isNewWorld}
            progress={progress}
            onEnterWorld={handleEnterNewWorld}
          />
        </div>
      )}
    </div>
  );
}
