using System;
using System.Collections.Generic;

namespace QuietStudyHall.Systems
{
    public sealed class LibraryEventBus
    {
        private readonly Dictionary<string, Action<object>> listeners = new Dictionary<string, Action<object>>();

        public void Subscribe(string eventName, Action<object> listener)
        {
            if (!listeners.ContainsKey(eventName)) listeners[eventName] = null;
            listeners[eventName] += listener;
        }

        public void Unsubscribe(string eventName, Action<object> listener)
        {
            if (listeners.ContainsKey(eventName)) listeners[eventName] -= listener;
        }

        public void Publish(string eventName, object payload = null)
        {
            if (listeners.TryGetValue(eventName, out Action<object> listener)) listener?.Invoke(payload);
        }

        public void Clear() { listeners.Clear(); }
    }
}
