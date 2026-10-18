/**
 * Chop & Mine - Centralized Logging & Diagnostics Service
 * Provides structured log levels, in-game debug feedback, and system health reporting.
 */

export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    constructor(prefix = "[Chop & Mine]") {
        this.prefix = prefix;
    }

    /**
     * Formats contextual details (player, coordinates, tool, dimension)
     */
    formatContext(context) {
        if (!context) return "";
        const parts = [];
        if (context.player) parts.push(`player=${context.player.name ?? context.player.id ?? "unknown"}`);
        if (context.dimension) parts.push(`dim=${context.dimension.id ?? context.dimension}`);
        if (context.location) parts.push(`pos=${context.location.x},${context.location.y},${context.location.z}`);
        if (context.tool) parts.push(`tool=${context.tool}`);
        if (context.target) parts.push(`target=${context.target}`);
        return parts.length > 0 ? ` (${parts.join(", ")})` : "";
    }

    /**
     * Logs debug information (only shown in console and sent to player if debugMode is active)
     */
    debug(message, context = null, player = null) {
        const text = `${this.prefix} [DEBUG] ${message}${this.formatContext(context)}`;
        console.warn(text);
        if (player) {
            try {
                player.sendMessage(`§d[Debug] §7${message}`);
            } catch {}
        }
    }

    /**
     * Logs general informative operational notices
     */
    info(message, context = null) {
        const text = `${this.prefix} [INFO] ${message}${this.formatContext(context)}`;
        console.warn(text);
    }

    /**
     * Logs non-fatal warning conditions
     */
    warn(message, context = null, player = null) {
        const text = `${this.prefix} [WARN] ${message}${this.formatContext(context)}`;
        console.warn(text);
        if (player) {
            try {
                player.sendMessage(`§e[Warning] §7${message}`);
            } catch {}
        }
    }

    /**
     * Logs fatal or recoverable error exceptions with full stack traces
     */
    error(message, error = null, context = null, player = null) {
        let errDetails = "";
        if (error) {
            errDetails = error.stack ? `\nStack: ${error.stack}` : ` | Error: ${error.message ?? error}`;
        }
        const text = `${this.prefix} [ERROR] ${message}${this.formatContext(context)}${errDetails}`;
        console.error(text);
        if (player) {
            try {
                player.sendMessage(`§c[Error] §7${message}: ${error?.message ?? "An error occurred"}`);
            } catch {}
        }
    }
}

export const logger = new Logger();
