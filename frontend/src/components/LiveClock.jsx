import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LiveClock({ className = "" }) {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");
  const [timezone, setTimezone] = useState("Europe/Berlin");

  useEffect(() => {
    // Fetch timezone setting once
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API}/settings`);
        if (response.data.timezone) {
          setTimezone(response.data.timezone);
        }
      } catch (error) {
        console.error("Failed to fetch settings");
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        const options = { timeZone: timezone };
        
        const timeStr = now.toLocaleTimeString('de-DE', {
          ...options,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        
        const dateStr = now.toLocaleDateString('de-DE', {
          ...options,
          weekday: 'short',
          day: '2-digit',
          month: '2-digit'
        });
        
        setTime(timeStr);
        setDate(dateStr);
      } catch (error) {
        // Fallback to local time if timezone fails
        const now = new Date();
        setTime(now.toLocaleTimeString('de-DE'));
        setDate(now.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }));
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border ${className}`}>
      <Clock className="w-4 h-4 text-primary" />
      <div className="flex flex-col items-end leading-none">
        <span className="font-mono text-lg font-bold text-primary tracking-wider">
          {time}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {date}
        </span>
      </div>
    </div>
  );
}
