using UnityEngine;
using UnityEngine.InputSystem;

namespace QuietStudyHall.Player
{
    public static class ModernInput
    {
        public static Vector2 Move()
        {
            if (Keyboard.current == null) return Vector2.zero;
            float x = (Keyboard.current.dKey.isPressed ? 1f : 0f) - (Keyboard.current.aKey.isPressed ? 1f : 0f);
            float y = (Keyboard.current.wKey.isPressed ? 1f : 0f) - (Keyboard.current.sKey.isPressed ? 1f : 0f);
            return Vector2.ClampMagnitude(new Vector2(x, y), 1f);
        }

        public static Vector2 MouseDelta()
        {
            return Mouse.current == null ? Vector2.zero : Mouse.current.delta.ReadValue();
        }

        public static bool Held(Key key)
        {
            return Keyboard.current != null && Keyboard.current[key].isPressed;
        }

        public static bool Down(Key key)
        {
            return Keyboard.current != null && Keyboard.current[key].wasPressedThisFrame;
        }
    }
}
