import { Navigate, Route, Routes } from "react-router-dom";
import { AlbumPage } from "./pages/Album";
import { EvidencePage } from "./pages/Evidence";
import { GuardianPage } from "./pages/Guardian";
import { LeaguePage } from "./pages/League";
import { LessonPage } from "./pages/Lesson";
import { PathPage } from "./pages/Path";
import { ResultPage } from "./pages/Result";
import { ScanPage } from "./pages/Scan";
import { StoriesPage } from "./pages/Stories";
import { TeacherPage } from "./pages/Teacher";
import { Welcome } from "./pages/Welcome";
import { useStore } from "./store";

export function App() {
  const profile = useStore((s) => s.profile);
  return (
    <Routes>
      {/* Docente y evidencia no requieren perfil de alumno */}
      <Route path="/docente" element={<TeacherPage />} />
      <Route path="/evidencia" element={<EvidencePage />} />
      {!profile ? (
        <Route path="*" element={<Welcome />} />
      ) : (
        <>
          <Route path="/" element={<PathPage />} />
          <Route path="/historias/:id" element={<StoriesPage />} />
          <Route path="/reto/:id" element={<LessonPage />} />
          <Route path="/resultado/:id" element={<ResultPage />} />
          <Route path="/escanear/:id" element={<ScanPage />} />
          <Route path="/album" element={<AlbumPage />} />
          <Route path="/liga" element={<LeaguePage />} />
          <Route path="/guardian" element={<GuardianPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}
