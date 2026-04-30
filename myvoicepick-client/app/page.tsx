import AudioUploader from '../components/AudioUploader';

export default function Home() {
  return (
    // 메인 레이아웃: 화면 전체 높이 사용, 내용 중앙 정렬, 다크 그레이 배경 (bg-zinc-950)
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-zinc-50 font-sans selection:bg-zinc-800">
      
      {/* 
        애플 스타일의 미니멀리즘과 부드러운 애니메이션 적용 
        animate-in과 fade-in을 통해 페이지 로드 시 자연스럽게 나타나도록 처리
      */}
      <div className="w-full max-w-3xl flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
        
        {/* 헤더 영역 */}
        <header className="text-center mb-10 sm:mb-14 space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white drop-shadow-sm">
            MyVoicePick
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg md:text-xl font-medium max-w-lg mx-auto leading-relaxed">
            당신의 목소리를 분석하여 <br className="sm:hidden" /> 가장 어울리는 아티스트를 찾아드립니다.
          </p>
        </header>

        {/* 업로드 컴포넌트 영역 */}
        <AudioUploader />
        
      </div>
    </main>
  );
}
