import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
            color: "white",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            fontFamily: "Arial"
          }}
        >
          <div
            style={{
              maxWidth: 500,
              textAlign: "center",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: 40,
              backdropFilter: "blur(20px)"
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 20 }}>💥</div>
            <h1 style={{ fontSize: 32, marginBottom: 10 }}>Oops! Something went wrong</h1>
            <p
              style={{
                color: "#9ca3af",
                marginBottom: 20,
                fontSize: 14
              }}
            >
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.href = "/"}
              style={{
                padding: "14px 28px",
                borderRadius: 12,
                border: "none",
                background: "#00e5ff",
                color: "black",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer",
                marginRight: 10
              }}
            >
              🏠 Go Home
            </button>
            <button
              onClick={this.resetError}
              style={{
                padding: "14px 28px",
                borderRadius: 12,
                border: "1px solid #00e5ff",
                background: "transparent",
                color: "#00e5ff",
                fontWeight: "bold",
                fontSize: 16,
                cursor: "pointer"
              }}
            >
              🔄 Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
