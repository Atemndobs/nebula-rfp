
import React from 'react';
import { AiProvider } from '../types';

interface LogoProps {
  className?: string;
  active?: boolean;
  disabled?: boolean;
}

const commonSvgProps = (props: LogoProps) => ({
  width: "16",
  height: "16",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: `${props.className || 'w-4 h-4'} ${props.disabled ? 'text-accents-4 dark:text-accents-5' : (props.active ? 'text-vercel-blue' : 'text-current')}`
});

const GeminiLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} aria-label="Gemini logo">
    {/* Simplified star/asterisk */}
    <path d="M12 2L14.5 7.5L20 9L15.5 13.5L17 19L12 15.5L7 19L8.5 13.5L4 9L9.5 7.5L12 2Z" strokeWidth="1.5" />
  </svg>
);

const OpenAiLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} viewBox="0 0 24 24" aria-label="OpenAI logo">
    {/* Simplified OpenAI swirl */}
    <path d="M16.5 7.5c-3 0-5.25 2.25-5.25 5.25S13.5 18 16.5 18c2.13 0 3.938-1.233 4.74-2.97M7.5 16.5c3 0 5.25-2.25 5.25-5.25S10.5 6 7.5 6c-2.13 0-3.938 1.233-4.74 2.97" strokeWidth="1.5" />
    <circle cx="16.5" cy="12.75" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="11.25" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

const AnthropicLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} viewBox="0 0 24 24" aria-label="Anthropic logo">
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">A</text>
  </svg>
);

const GroqLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} viewBox="0 0 24 24" aria-label="Groq logo">
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">G</text>
  </svg>
);

const DeepSeekLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} viewBox="0 0 24 24" aria-label="DeepSeek logo">
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none">DS</text>
  </svg>
);

const OllamaLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} viewBox="0 0 24 24" aria-label="Ollama logo">
    {/* Simplified Llama head */}
    <path d="M17 10c0 3.5-2.5 6.5-5 6.5S7 13.5 7 10s2.5-6.5 5-6.5S17 6.5 17 10Z" strokeWidth="1.5"/>
    <path d="M7 10V8m0 2c0-1-1-1.5-1-1.5M17 10V8m0 2c0-1 1-1.5 1-1.5m-7 6.5v2.5M10 19h4" strokeWidth="1.5"/>
  </svg>
);

const LmStudioLogo: React.FC<LogoProps> = (props) => (
  <svg {...commonSvgProps(props)} viewBox="0 0 24 24" aria-label="LM Studio logo">
    <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold" fill="currentColor" stroke="none">LM</text>
  </svg>
);


export const ProviderLogo: React.FC<{ provider: AiProvider, className?: string, active?: boolean, disabled?: boolean }> = ({ provider, className, active = false, disabled = false }) => {
  const logoProps: LogoProps = { className, active, disabled };
  switch (provider) {
    case AiProvider.GEMINI:
      return <GeminiLogo {...logoProps} />;
    case AiProvider.OPENAI:
      return <OpenAiLogo {...logoProps} />;
    case AiProvider.ANTHROPIC:
      return <AnthropicLogo {...logoProps} />;
    case AiProvider.GROQ:
      return <GroqLogo {...logoProps} />;
    case AiProvider.DEEPSEEK:
      return <DeepSeekLogo {...logoProps} />;
    case AiProvider.OLLAMA:
      return <OllamaLogo {...logoProps} />;
    case AiProvider.LM_STUDIO:
      return <LmStudioLogo {...logoProps} />;
    default: 
      return ( // Fallback Generic AI Icon
        <svg xmlns="http://www.w3.org/2000/svg" {...commonSvgProps(logoProps)} aria-label="AI logo">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 21v-1.5M15.75 3v1.5m3.75 3.75H21m-3.75 0H21m-3.75 0H21m0 0v1.5m0 0v1.5m0 0v1.5m0 0v1.5M12 5.25c-3.443 0-6.201 2.644-6.682 6H3.75a.75.75 0 000 1.5h1.568c.48 3.356 3.24 6 6.682 6s6.201-2.644 6.682-6h1.568a.75.75 0 000-1.5h-1.568c-.48-3.356-3.24-6-6.682-6zM12 8.25a3.75 3.75 0 100 7.5 3.75 3.75 0 000-7.5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};