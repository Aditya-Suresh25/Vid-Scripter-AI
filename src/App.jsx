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
  const [topic, setTopic] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [appState, setAppState] = useState('SELECT_CATEGORY'); // SELECT_CATEGORY, AWAITING_TOPIC, EDITING

  useEffect(() => {
    document.body.className = theme;
    document.documentElement.style.backgroundColor = theme === 'dark' ? '#111827' : '#f9fafb';
  }, [theme]);

  const handleCategorySelect = (category) => {
    setActiveCategory(category);
    setAppState('AWAITING_TOPIC');
    setChatHistory(prev => [...prev, 
      { sender: 'user', text: `I'll make a "${category}" video.` },
      { sender: 'ai', text: `Great! What is the specific topic for your ${category} video?` }
    ]);
  };

  const submitUserMessage = useCallback(async (userInput) => {
    if (!userInput.trim()) return;

    const newHistory = [...chatHistory, { sender: 'user', text: userInput }];
    setChatHistory(newHistory);
    setIsLoading(true);

    let prompt;
    if (appState === 'AWAITING_TOPIC') {
      setTopic(userInput);
      prompt = `Generate a comprehensive YouTube video script for the category: "${activeCategory}" on the topic: "${userInput}". The script should include a catchy intro, detailed main content with multiple points, and a compelling outro with a call to action.`;
    } else { // 'EDITING' state
      prompt = `Based on the previous script and conversation, refine the script with the following instruction: "${userInput}".\n\nPrevious Script:\n${script}`;
    }

    try {
      // Securely call your backend endpoint with the full URL
      const response = await fetch('/api/generateText', {
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
        const followUpMessage = { sender: 'ai', text: "Here's the updated script. You can now generate a thumbnail, get hashtags, or ask me to refine the script further." };
        setChatHistory(prev => [...prev, aiMessage, followUpMessage]);
        setAppState('EDITING');
      } else {
        const errorMessage = { sender: 'ai', text: 'Sorry, I had trouble generating a script. The model returned an unexpected response.' };
        setChatHistory(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error("Error generating script:", error);
      const errorMessage = { sender: 'ai', text: `An error occurred: ${error.message}` };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [script, appState, activeCategory, chatHistory]);

  const generateThumbnail = useCallback(async () => {
    if (!topic) return;
    setIsThumbnailLoading(true);
    setThumbnailUrl('');

    // A prompt suitable for Gemini image generation
    const prompt = `A professional, high-resolution YouTube thumbnail for a ${activeCategory} video about "${topic}". Must be eye-catching and cinematic.`;

    try {
        // Securely call the new backend endpoint for Gemini
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
        // Adjust parsing for the generateContent response structure
        const base64Data = result?.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Data) {
          const imageUrl = `data:image/png;base64,${base64Data}`;
          setThumbnailUrl(imageUrl);
        } else {
          console.error("Failed to generate thumbnail with Gemini:", result);
          setChatHistory(prev => [...prev, {sender: 'ai', text: 'Sorry, I couldn\'t generate a thumbnail with Gemini. The model returned an unexpected response.'}]);
        }
    } catch (error) {
        console.error("Error generating thumbnail:", error);
        setChatHistory(prev => [...prev, {sender: 'ai', text: `An error occurred while generating the thumbnail: ${error.message}`}]);
    } finally {
        setIsThumbnailLoading(false);
    }
  }, [topic, activeCategory]);

  const generateHashtags = useCallback(async () => {
    if (!script) return;
    setIsHashtagLoading(true);
    
    const prompt = `Based on the following YouTube video script, generate a list of 15-20 relevant and SEO-optimized hashtags. Include a mix of broad and niche tags. Format them as a single line of text, with each tag starting with '#'.\n\nScript:\n${script}`;
    
    try {
      // Securely call your backend endpoint with the full URL
      const response = await fetch('/api/generateText', {
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
            <ChatInput onSendMessage={submitUserMessage} isLoading={isLoading} appState={appState} />
          </div>
        </main>
      </div>
    </div>
  );
};

// --- COMPONENTS ---

const Header = ({ theme, setTheme }) => (
  <header className="flex justify-between items-center">
    <h1 className="text-3xl md:text-4xl font-bold">Vid Scripter AI 🤖</h1>
    <ThemeSwitcher theme={theme} toggleTheme={() => setTheme(t => t === 'light' ? 'dark' : 'light')} />
  </header>
);

const ThemeSwitcher = ({ theme, toggleTheme }) => (
  <button onClick={toggleTheme} className={`p-2 rounded-full transition-colors duration-300 ${theme === 'dark' ? 'bg-yellow-400 text-gray-900' : 'bg-gray-700 text-white'}`}>
    {theme === 'dark' ? '☀️' : '🌙'}
  </button>
);

const Sidebar = ({ isLoading, activeCategory, onCategorySelect, appState, bubbleTheme, setBubbleTheme, theme }) => {
    const categories = ['Tech', 'Gaming', 'Vlogging', 'Educational', 'Comedy', 'DIY'];
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
                            disabled={isLoading || appState !== 'SELECT_CATEGORY'}
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

const ChatInput = ({ onSendMessage, isLoading, appState }) => {
    const [input, setInput] = useState('');
    const isDisabled = isLoading || appState === 'SELECT_CATEGORY';

    const handleSubmit = (e) => {
        e.preventDefault();
        onSendMessage(input);
        setInput('');
    };

    const getPlaceholder = () => {
        if (appState === 'SELECT_CATEGORY') return 'Select a category to begin...';
        if (appState === 'AWAITING_TOPIC') return 'Enter your video topic here...';
        return 'Describe the changes you want...';
    };

    return (
        <form onSubmit={handleSubmit} className="mt-auto pt-4">
            <div className="flex items-center p-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 bg-gray-100">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isDisabled}
                    placeholder={getPlaceholder()}
                    className="flex-grow bg-transparent focus:outline-none px-2"
                />
                <button type="submit" disabled={isDisabled} className="p-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </button>
            </div>
        </form>
    );
};

export default App;
