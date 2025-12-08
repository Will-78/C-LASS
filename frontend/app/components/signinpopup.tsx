"use client";

type SignInPopupProps = {
  onClose: () => void;
};

export default function SignInPopup({ onClose }: SignInPopupProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 12,
          minWidth: 300,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Popup Title */}
        <h2
          style={{
            marginBottom: 20,
            color: "#10B981", // green text
            fontWeight: "bold",
          }}
        >
          Sign In
        </h2>

        {/* Teacher Button */}
        <button
          style={{
            width: "100%",
            padding: "10px 0",
            marginBottom: 12,
            borderRadius: 12,
            border: "2px solid #333",
            backgroundColor: "#fff",
            cursor: "pointer",
            color: "#10B981",
            fontWeight: "bold",
          }}
        >
          Teacher
        </button>

        {/* Student Button */}
        <button
          style={{
            width: "100%",
            padding: "10px 0",
            marginBottom: 12,
            borderRadius: 12,
            border: "2px solid #333",
            backgroundColor: "#fff",
            cursor: "pointer",
            color: "#10B981",
            fontWeight: "bold",
          }}
        >
          Student
        </button>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 0",
            borderRadius: 12,
            border: "2px solid #333",
            backgroundColor: "#fff",
            cursor: "pointer",
            color: "#10B981",
            fontWeight: "bold",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
