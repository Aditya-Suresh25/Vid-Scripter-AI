import React, { useState, useEffect, useCallback, useRef } from 'react';

// Main App Component (App.js)
// Manages state, layout, and core logic
const App = () => {
  const [theme, setTheme] = useState('dark');
  const [bubbleTheme, setBubbleTheme] = useState('blue');
  const [chatHistory, setChatHistory] = useState([{ sender: 'ai', text: 'Welcome! Start by selecting a video category.' }]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThumbnailLoading, setIsThumbnailLoading] = useState(false);
  const [isHashtagLoading, setIsHashtagLoading] = useState(false);
  const [script, setScript] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [topic, setTopic] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [appState, setAppState] = useState('SELECT_CATEGORY'); // SELECT_CATEGORY, AWAITING_TOPIC, EDITING

  useEffect(() => {
    document.body.className = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f9fafb';
  }, [theme]);

  const handleCategorySelect = (category) => {
    // Allow switching categories
    setScript('');
    setTopic('');
    setThumbnailUrl('');
    setHashtags('');
    setActiveCategory(category);

    if (category === 'Custom') {
        setAppState('AWAITING_TOPIC');
        setChatHistory([{ sender: 'ai', text: 'Great! Please enter your custom category name first.' }]);
    } else {
        setAppState('AWAITING_TOPIC');
        setChatHistory([
            { sender: 'user', text: `I'll make a "${category}" video.` },
            { sender: 'ai', text: `Awesome! What is the specific topic for your ${category} video?` }
        ]);
    }
  };

  const submitUserMessage = useCallback(async (userInput) => {
    if (!userInput.trim()) return;

    const newHistory = [...chatHistory, { sender: 'user', text: userInput }];
    setChatHistory(newHistory);
    setIsLoading(true);

    let prompt;
    let currentCategory = activeCategory === 'Custom' ? customCategory : activeCategory;

    if (appState === 'AWAITING_TOPIC') {
        if(activeCategory === 'Custom' && !customCategory) {
            setCustomCategory(userInput);
            setChatHistory(prev => [...prev, { sender: 'ai', text: `Custom category set to "${userInput}". Now, what's the video topic?` }]);
            setIsLoading(false);
            return;
        }
      setTopic(userInput);
      currentCategory = activeCategory === 'Custom' ? customCategory || userInput : activeCategory;
      prompt = `Generate a comprehensive YouTube video script for the category: "${currentCategory}" on the topic: "${userInput}". The script should include a catchy intro, detailed main content with multiple points, and a compelling outro with a call to action.`;
    } else { // 'EDITING' state
      // Update topic if user seems to be changing it
      setTopic(prevTopic => `${prevTopic} (${userInput})`); 
      prompt = `Based on the previous script and conversation, refine the script with the following instruction: "${userInput}".\n\nPrevious Script:\n${script}`;
    }

    try {
      const response = await fetch('/api/generateScript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        const generatedText = result.candidates[0].content.parts[0].text;
        setScript(generatedText);
        const aiMessage = { sender: 'ai', text: generatedText };
        const followUpMessage = { sender: 'ai', text: "Here's the updated script. You can now generate a thumbnail, get hashtags, or ask me to refine it further." };
        setChatHistory(prev => [...prev, aiMessage, followUpMessage]);
        setAppState('EDITING');
      } else {
        const errorMessage = { sender: 'ai', text: 'Sorry, I had trouble generating a script.' };
        setChatHistory(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error generating script:", error);
      const errorMessage = { sender: 'ai', text: `An error occurred: ${error.message}` };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [script, appState, activeCategory, customCategory, chatHistory]);

  const generateThumbnail = useCallback(async () => {
    if (!topic) return;
    setIsThumbnailLoading(true);
    setThumbnailUrl('');

    const currentCategory = activeCategory === 'Custom' ? customCategory : activeCategory;
    const prompt = `A professional, high-resolution YouTube thumbnail for a ${currentCategory} video about "${topic}". Must be eye-catching and cinematic.`;

    try {
        const response = await fetch('/api/generateImageWithGemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: prompt })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const result = await response.json();
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Data) {
          const imageUrl = `data:image/png;base64,${base64Data}`;
          setThumbnailUrl(imageUrl);
        } else {
          console.error("Failed to generate thumbnail with Gemini:", result);
          setChatHistory(prev => [...prev, {sender: 'ai', text: 'Sorry, I couldn\'t generate a thumbnail.'}]);
        }
    } catch (error) {
        console.error("Error generating thumbnail:", error);
        setChatHistory(prev => [...prev, {sender: 'ai', text: `An error occurred while generating the thumbnail: ${error.message}`}]);
    } finally {
        setIsThumbnailLoading(false);
    }
  }, [topic, activeCategory, customCategory]);

  const generateHashtags = useCallback(async () => {
    if (!script) return;
    setIsHashtagLoading(true);
    
    const prompt = `Based on the following YouTube video script, generate a list of 15-20 relevant and SEO-optimized hashtags. Include a mix of broad and niche tags. Format them as a single line of text, with each tag starting with '#'.\n\nScript:\n${script}`;
    
    try {
      const response = await fetch('/api/generateHashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        setHashtags(result.candidates[0].content.parts[0].text);
      } else {
        setChatHistory(prev => [...prev, {sender: 'ai', text: 'Sorry, I had trouble generating hashtags.'}]);
      }
    } catch (error) {
        console.error("Error generating hashtags:", error);
        setChatHistory(prev => [...prev, {sender: 'ai', text: `An error occurred while generating hashtags: ${error.message}`}]);
    } finally {
        setIsHashtagLoading(false);
    }
  }, [script]);

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Add styles for the glowing border animation */}
      <style>{`
        @keyframes glowing {
          0% { background-position: 0 0; }
          50% { background-position: 400% 0; }
          100% { background-position: 0 0; }
        }
        .glowing-border::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 0.75rem; /* 12px */
          border: 2px solid transparent;
          background: linear-gradient(45deg, #ff0000, #ff7300, #fffb00, #48ff00, #00ffd5, #002bff, #7a00ff, #ff00c8, #ff0000) border-box;
          background-size: 400%;
          -webkit-mask: 
             linear-gradient(#fff 0 0) content-box, 
             linear-gradient(#fff 0 0);
          -webkit-mask-composite: destination-out;
          mask-composite: exclude;
          animation: glowing 10s linear infinite;
          pointer-events: none;
        }
      `}</style>
      <div className="container mx-auto p-4 md:p-8">
        <Header theme={theme} setTheme={setTheme} />
        <main className="grid md:grid-cols-3 gap-8 mt-8">
          <Sidebar
            isLoading={isLoading}
            activeCategory={activeCategory}
            onCategorySelect={handleCategorySelect}
            appState={appState}
            bubbleTheme={bubbleTheme}
            setBubbleTheme={setBubbleTheme}
            theme={theme}
            customCategory={customCategory}
            setCustomCategory={setCustomCategory}
          />
          <div className="md:col-span-2 flex flex-col h-[85vh]">
            <ChatWindow chatHistory={chatHistory} bubbleTheme={bubbleTheme} isLoading={isLoading} />
            <div className="mt-4 flex-grow flex flex-col gap-4 overflow-y-auto">
                 <ScriptEditor script={script} setScript={setScript} theme={theme} />
                 <ThumbnailGenerator
                    onGenerate={generateThumbnail}
                    thumbnailUrl={thumbnailUrl}
                    isLoading={isThumbnailLoading}
                    appState={appState}
                 />
                 <HashtagGenerator
                    onGenerate={generateHashtags}
                    hashtags={hashtags}
                    isLoading={isHashtagLoading}
                    appState={appState}
                    theme={theme}
                 />
            </div>
            <ChatInput onSendMessage={submitUserMessage} isLoading={isLoading} appState={appState} activeCategory={activeCategory} customCategory={customCategory} />
          </div>
        </main>
      </div>
    </div>
  );
};

// --- COMPONENTS ---

const Header = ({ theme, setTheme }) => (
  <header className="flex justify-between items-center">
    <img src="/logo.svg" alt="VidScript AI Logo" className="h-12" />
    <ThemeSwitcher theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
  </header>
);

const ThemeSwitcher = ({ theme, toggleTheme }) => (
  <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-white'}`}>
    {theme === 'dark' ? '☀️' : '🌙'}
  </button>
);

const Sidebar = ({ isLoading, activeCategory, onCategorySelect, bubbleTheme, setBubbleTheme, theme }) => {
    const categories = ['Tech', 'Gaming', 'Vlogging', 'Educational', 'Comedy', 'DIY', 'Custom'];
    const bubbleColors = {
        blue: { user: 'bg-blue-500', ai: 'bg-blue-700' },
        green: { user: 'bg-green-500', ai: 'bg-green-700' },
        purple: { user: 'bg-purple-500', ai: 'bg-purple-700' },
        pink: { user: 'bg-pink-500', ai: 'bg-pink-700' },
    };

    return (
        <div className="md:col-span-1 space-y-6">
            <div>
                <h2 className="text-xl font-semibold mb-4">1. Select a Category</h2>
                <div className="grid grid-cols-2 gap-4">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => onCategorySelect(cat)}
                            disabled={isLoading}
                            className={`p-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${activeCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : (theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-200 shadow-sm')}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>
            <div>
                <h2 className="text-xl font-semibold mb-4">Chat Bubble Theme</h2>
                <div className="flex space-x-2">
                    {Object.keys(bubbleColors).map(color => (
                        <button key={color} onClick={() => setBubbleTheme(color)} className={`w-8 h-8 rounded-full ${bubbleColors[color].user} ${bubbleTheme === color ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`}></button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ChatWindow = ({ chatHistory, bubbleTheme, isLoading }) => {
  const chatEndRef = useRef(null);
  const bubbleColors = {
    blue: { user: 'bg-blue-500', ai: 'dark:bg-gray-700 bg-gray-200' },
    green: { user: 'bg-green-500', ai: 'dark:bg-gray-700 bg-gray-200' },
    purple: { user: 'bg-purple-500', ai: 'dark:bg-gray-700 bg-gray-200' },
    pink: { user: 'bg-pink-500', ai: 'dark:bg-gray-700 bg-gray-200' },
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  return (
    <div className="p-4 rounded-lg overflow-y-auto space-y-4 dark:bg-gray-800 bg-white h-full">
      {chatHistory.map((msg, index) => (
        <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-xl p-3 rounded-lg whitespace-pre-wrap ${msg.sender === 'user' ? `${bubbleColors[bubbleTheme].user} text-white` : `${bubbleColors[bubbleTheme].ai} dark:text-gray-200 text-gray-800`}`}>
            {msg.text}
          </div>
        </div>
      ))}
      {isLoading && (
        <div className="flex justify-start">
          <div className={`max-w-md p-3 rounded-lg ${bubbleColors[bubbleTheme].ai}`}>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-300"></div>
            </div>
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
};

const ScriptEditor = ({ script, setScript, theme }) => (
    <div className="flex flex-col">
        <h2 className="text-xl font-semibold mb-2">2. Final Script</h2>
        <textarea
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className={`w-full p-4 rounded-lg h-48 resize-y ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border`}
            placeholder="Your generated script will appear here. You can edit it directly."
        />
    </div>
);

const ThumbnailGenerator = ({ onGenerate, thumbnailUrl, isLoading, appState }) => {
    const isDisabled = isLoading || appState !== 'EDITING';
    
    const handleDownload = () => {
        if (!thumbnailUrl) return;
        const link = document.createElement('a');
        link.href = thumbnailUrl;
        link.download = 'thumbnail.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">3. AI Thumbnail</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className={`aspect-video rounded-lg flex items-center justify-center ${thumbnailUrl || isLoading ? 'bg-gray-700' : 'bg-gray-800 border-2 border-dashed border-gray-600'}`}>
                    {isLoading && <div className="text-white">Generating...</div>}
                    {!isLoading && thumbnailUrl && <img src={thumbnailUrl} alt="Generated AI Thumbnail" className="w-full h-full object-cover rounded-lg" />}
                    {!isLoading && !thumbnailUrl && <div className="text-gray-400 text-center p-4">Your thumbnail will appear here.</div>}
                </div>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={onGenerate}
                        disabled={isDisabled}
                        className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        {isLoading ? 'Creating...' : 'Generate Thumbnail ✨'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!thumbnailUrl}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                        Download 📥
                    </button>
                </div>
            </div>
        </div>
    );
};

const HashtagGenerator = ({ onGenerate, hashtags, isLoading, appState, theme }) => {
    const isDisabled = isLoading || appState !== 'EDITING';
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!hashtags) return;
        const textarea = document.createElement('textarea');
        textarea.value = hashtags;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div>
            <h2 className="text-xl font-semibold mb-2">4. Hashtags</h2>
            <div className="flex gap-4">
                <div className={`flex-grow p-4 rounded-lg relative ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-300'}`}>
                    <p className="text-sm">{hashtags || 'Click generate to get hashtags...'}</p>
                    {hashtags && (
                        <button onClick={handleCopy} className={`absolute top-2 right-2 p-1 rounded-md ${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'}`}>
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    )}
                </div>
                <button
                    onClick={onGenerate}
                    disabled={isDisabled}
                    className="bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                    {isLoading ? '...' : 'Get Hashtags #'}
                </button>
            </div>
        </div>
    );
};

const ChatInput = ({ onSendMessage, isLoading, appState, activeCategory, customCategory }) => {
    const [input, setInput] = useState('');
    const isDisabled = isLoading || appState === 'SELECT_CATEGORY';

    const handleSubmit = (e) => {
        e.preventDefault();
        onSendMessage(input);
        setInput('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !isDisabled) {
            onSendMessage(input);
            setInput('');
        }
    };

    const getPlaceholder = () => {
        if (appState === 'SELECT_CATEGORY') return 'Select a category to begin...';
        if (activeCategory === 'Custom' && !customCategory) return 'Enter your custom category name...';
        if (appState === 'AWAITING_TOPIC') return 'Enter your video topic here...';
        return 'Describe the changes you want...';
    };

    return (
        <form onSubmit={handleSubmit} className="mt-auto pt-4">
            <div className="mt-auto pt-4">
            <style jsx>{`
                @keyframes rainbow-glow {
                    0% { 
                        background-position: 0% 50%;
                        box-shadow: 0 0 30px rgba(255, 107, 53, 0.4),
                                   0 0 60px rgba(255, 107, 53, 0.2),
                                   0 0 90px rgba(255, 107, 53, 0.1);
                    }
                    16.66% { 
                        background-position: 16.66% 50%;
                        box-shadow: 0 0 30px rgba(247, 147, 30, 0.4),
                                   0 0 60px rgba(247, 147, 30, 0.2),
                                   0 0 90px rgba(247, 147, 30, 0.1);
                    }
                    33.33% { 
                        background-position: 33.33% 50%;
                        box-shadow: 0 0 30px rgba(255, 215, 0, 0.4),
                                   0 0 60px rgba(255, 215, 0, 0.2),
                                   0 0 90px rgba(255, 215, 0, 0.1);
                    }
                    50% { 
                        background-position: 50% 50%;
                        box-shadow: 0 0 30px rgba(50, 205, 50, 0.4),
                                   0 0 60px rgba(50, 205, 50, 0.2),
                                   0 0 90px rgba(50, 205, 50, 0.1);
                    }
                    66.66% { 
                        background-position: 66.66% 50%;
                        box-shadow: 0 0 30px rgba(0, 191, 255, 0.4),
                                   0 0 60px rgba(0, 191, 255, 0.2),
                                   0 0 90px rgba(0, 191, 255, 0.1);
                    }
                    83.33% { 
                        background-position: 83.33% 50%;
                        box-shadow: 0 0 30px rgba(65, 105, 225, 0.4),
                                   0 0 60px rgba(65, 105, 225, 0.2),
                                   0 0 90px rgba(65, 105, 225, 0.1);
                    }
                    100% { 
                        background-position: 100% 50%;
                        box-shadow: 0 0 30px rgba(138, 43, 226, 0.4),
                                   0 0 60px rgba(138, 43, 226, 0.2),
                                   0 0 90px rgba(138, 43, 226, 0.1);
                    }
                }
                
                .rainbow-border {
                    position: relative;
                    padding: 2px;
                    border-radius: 50px;
                    background: linear-gradient(
                        90deg,
                        #ff6b35 0%,
                        #f7931e 14.28%,
                        #ffd700 28.57%,
                        #32cd32 42.86%,
                        #00bfff 57.14%,
                        #4169e1 71.43%,
                        #8a2be2 85.71%,
                        #ff1493 100%
                    );
                    background-size: 400% 100%;
                    animation: rainbow-glow 4s ease-in-out infinite;
                }
                
                .input-container {
                    background: #1a1a1a;
                    border-radius: 50px;
                    backdrop-filter: blur(20px);
                    border: none;
                    position: relative;
                    overflow: hidden;
                }
                
                .input-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
                    border-radius: 50px;
                    pointer-events: none;
                }
                
                .custom-input {
                    background: transparent;
                    border: none;
                    outline: none;
                    color: white;
                    font-size: 16px;
                    font-weight: 400;
                }
                
                .custom-input::placeholder {
                    color: rgba(255, 255, 255, 0.5);
                    font-weight: 300;
                }
                
                .custom-input:focus::placeholder {
                    color: rgba(255, 255, 255, 0.3);
                }
                
                .send-button {
                    background: transparent;
                    border: none;
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    padding: 8px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .send-button:hover:not(:disabled) {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    transform: scale(1.05);
                }
                
                .send-button:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
            `}</style>
            <div className="rainbow-border">
                <div className="input-container flex items-center py-3 px-6">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={isDisabled}
                        placeholder={getPlaceholder()}
                        className="custom-input flex-grow mr-3"
                    />
                    <button 
                        type="button"
                        onClick={() => {
                            if (!isDisabled) {
                                onSendMessage(input);
                                setInput('');
                            }
                        }}
                        disabled={isDisabled} 
                        className="send-button"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14"/>
                            <path d="m12 5 7 7-7 7"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
        </form>
    );
};

export default App;
