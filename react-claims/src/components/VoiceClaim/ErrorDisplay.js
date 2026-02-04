"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorDisplay = void 0;
const react_1 = require("react");
require("./styles.css");
/**
 * ErrorDisplay - Component for displaying error messages with appropriate actions
 *
 * This component shows error messages with context-appropriate icons and actions,
 * allowing users to retry or fall back to form-based input.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.5
 */
const ErrorDisplay = ({ error, errorType, onRetry, onFallback }) => {
    /**
     * Get icon based on error type
     */
    const getErrorIcon = () => {
        switch (errorType) {
            case 'connection':
                return '🔌';
            case 'audio':
                return '🎤';
            case 'permission':
                return '🔒';
            case 'network':
                return '📡';
            case 'submission':
                return '📤';
            default:
                return '⚠️';
        }
    };
    /**
     * Get error title based on error type
     */
    const getErrorTitle = () => {
        switch (errorType) {
            case 'connection':
                return 'Connection Error';
            case 'audio':
                return 'Audio Error';
            case 'permission':
                return 'Permission Required';
            case 'network':
                return 'Network Error';
            case 'submission':
                return 'Submission Error';
            default:
                return 'Error';
        }
    };
    /**
     * Determine if error is retryable
     */
    const isRetryable = () => {
        return errorType !== 'permission' && onRetry !== undefined;
    };
    return (<div className="error-display">
      <div className="error-display-icon" role="img" aria-label={getErrorTitle()}>
        {getErrorIcon()}
      </div>
      
      <div className="error-display-content">
        <h3 className="error-display-title">{getErrorTitle()}</h3>
        <p className="error-display-message">{error}</p>
        
        {errorType === 'permission' && (<div className="error-display-help">
            <p>To use voice claim submission, please:</p>
            <ol>
              <li>Click the microphone icon in your browser's address bar</li>
              <li>Select "Allow" to grant microphone access</li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>)}
      </div>

      <div className="error-display-actions">
        {isRetryable() && (<button className="btn-error-retry" onClick={onRetry} aria-label="Try again">
            🔄 Try Again
          </button>)}
        <button className="btn-error-fallback" onClick={onFallback} aria-label="Use form-based input instead">
          📝 Use Form Instead
        </button>
      </div>
    </div>);
};
exports.ErrorDisplay = ErrorDisplay;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXJyb3JEaXNwbGF5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiRXJyb3JEaXNwbGF5LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxpQ0FBMEI7QUFFMUIsd0JBQXNCO0FBbUJ0Qjs7Ozs7OztHQU9HO0FBQ0ksTUFBTSxZQUFZLEdBQWdDLENBQUMsRUFDeEQsS0FBSyxFQUNMLFNBQVMsRUFDVCxPQUFPLEVBQ1AsVUFBVSxFQUNYLEVBQUUsRUFBRTtJQUNIOztPQUVHO0lBQ0gsTUFBTSxZQUFZLEdBQUcsR0FBVyxFQUFFO1FBQ2hDLFFBQVEsU0FBUyxFQUFFLENBQUM7WUFDbEIsS0FBSyxZQUFZO2dCQUNmLE9BQU8sSUFBSSxDQUFDO1lBQ2QsS0FBSyxPQUFPO2dCQUNWLE9BQU8sSUFBSSxDQUFDO1lBQ2QsS0FBSyxZQUFZO2dCQUNmLE9BQU8sSUFBSSxDQUFDO1lBQ2QsS0FBSyxTQUFTO2dCQUNaLE9BQU8sSUFBSSxDQUFDO1lBQ2QsS0FBSyxZQUFZO2dCQUNmLE9BQU8sSUFBSSxDQUFDO1lBQ2Q7Z0JBQ0UsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztJQUNILENBQUMsQ0FBQztJQUVGOztPQUVHO0lBQ0gsTUFBTSxhQUFhLEdBQUcsR0FBVyxFQUFFO1FBQ2pDLFFBQVEsU0FBUyxFQUFFLENBQUM7WUFDbEIsS0FBSyxZQUFZO2dCQUNmLE9BQU8sa0JBQWtCLENBQUM7WUFDNUIsS0FBSyxPQUFPO2dCQUNWLE9BQU8sYUFBYSxDQUFDO1lBQ3ZCLEtBQUssWUFBWTtnQkFDZixPQUFPLHFCQUFxQixDQUFDO1lBQy9CLEtBQUssU0FBUztnQkFDWixPQUFPLGVBQWUsQ0FBQztZQUN6QixLQUFLLFlBQVk7Z0JBQ2YsT0FBTyxrQkFBa0IsQ0FBQztZQUM1QjtnQkFDRSxPQUFPLE9BQU8sQ0FBQztRQUNuQixDQUFDO0lBQ0gsQ0FBQyxDQUFDO0lBRUY7O09BRUc7SUFDSCxNQUFNLFdBQVcsR0FBRyxHQUFZLEVBQUU7UUFDaEMsT0FBTyxTQUFTLEtBQUssWUFBWSxJQUFJLE9BQU8sS0FBSyxTQUFTLENBQUM7SUFDN0QsQ0FBQyxDQUFDO0lBRUYsT0FBTyxDQUNMLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQzVCO01BQUEsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FDekU7UUFBQSxDQUFDLFlBQVksRUFBRSxDQUNqQjtNQUFBLEVBQUUsR0FBRyxDQUVMOztNQUFBLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyx1QkFBdUIsQ0FDcEM7UUFBQSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQyxhQUFhLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FDekQ7UUFBQSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBRS9DOztRQUFBLENBQUMsU0FBUyxLQUFLLFlBQVksSUFBSSxDQUM3QixDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQ2pDO1lBQUEsQ0FBQyxDQUFDLENBQUMsc0NBQXNDLEVBQUUsQ0FBQyxDQUM1QztZQUFBLENBQUMsRUFBRSxDQUNEO2NBQUEsQ0FBQyxFQUFFLENBQUMsdURBQXVELEVBQUUsRUFBRSxDQUMvRDtjQUFBLENBQUMsRUFBRSxDQUFDLHlDQUF5QyxFQUFFLEVBQUUsQ0FDakQ7Y0FBQSxDQUFDLEVBQUUsQ0FBQyw4QkFBOEIsRUFBRSxFQUFFLENBQ3hDO1lBQUEsRUFBRSxFQUFFLENBQ047VUFBQSxFQUFFLEdBQUcsQ0FBQyxDQUNQLENBQ0g7TUFBQSxFQUFFLEdBQUcsQ0FFTDs7TUFBQSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsdUJBQXVCLENBQ3BDO1FBQUEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUNoQixDQUFDLE1BQU0sQ0FDTCxTQUFTLENBQUMsaUJBQWlCLENBQzNCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUNqQixVQUFVLENBQUMsV0FBVyxDQUV0Qjs7VUFDRixFQUFFLE1BQU0sQ0FBQyxDQUNWLENBQ0Q7UUFBQSxDQUFDLE1BQU0sQ0FDTCxTQUFTLENBQUMsb0JBQW9CLENBQzlCLE9BQU8sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUNwQixVQUFVLENBQUMsOEJBQThCLENBRXpDOztRQUNGLEVBQUUsTUFBTSxDQUNWO01BQUEsRUFBRSxHQUFHLENBQ1A7SUFBQSxFQUFFLEdBQUcsQ0FBQyxDQUNQLENBQUM7QUFDSixDQUFDLENBQUM7QUEvRlcsUUFBQSxZQUFZLGdCQStGdkIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUmVhY3QgZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgRXJyb3JUeXBlIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgJy4vc3R5bGVzLmNzcyc7XG5cbi8qKlxuICogUHJvcHMgZm9yIEVycm9yRGlzcGxheSBjb21wb25lbnRcbiAqL1xuaW50ZXJmYWNlIEVycm9yRGlzcGxheVByb3BzIHtcbiAgLyoqIEVycm9yIG1lc3NhZ2UgdG8gZGlzcGxheSAqL1xuICBlcnJvcjogc3RyaW5nO1xuICBcbiAgLyoqIFR5cGUgb2YgZXJyb3IgZm9yIGFwcHJvcHJpYXRlIGljb24gYW5kIHN0eWxpbmcgKi9cbiAgZXJyb3JUeXBlOiBFcnJvclR5cGU7XG4gIFxuICAvKiogQ2FsbGJhY2sgd2hlbiB1c2VyIGNsaWNrcyBcIlRyeSBBZ2FpblwiICovXG4gIG9uUmV0cnk/OiAoKSA9PiB2b2lkO1xuICBcbiAgLyoqIENhbGxiYWNrIHdoZW4gdXNlciBjbGlja3MgXCJVc2UgRm9ybSBJbnN0ZWFkXCIgKi9cbiAgb25GYWxsYmFjazogKCkgPT4gdm9pZDtcbn1cblxuLyoqXG4gKiBFcnJvckRpc3BsYXkgLSBDb21wb25lbnQgZm9yIGRpc3BsYXlpbmcgZXJyb3IgbWVzc2FnZXMgd2l0aCBhcHByb3ByaWF0ZSBhY3Rpb25zXG4gKiBcbiAqIFRoaXMgY29tcG9uZW50IHNob3dzIGVycm9yIG1lc3NhZ2VzIHdpdGggY29udGV4dC1hcHByb3ByaWF0ZSBpY29ucyBhbmQgYWN0aW9ucyxcbiAqIGFsbG93aW5nIHVzZXJzIHRvIHJldHJ5IG9yIGZhbGwgYmFjayB0byBmb3JtLWJhc2VkIGlucHV0LlxuICogXG4gKiBSZXF1aXJlbWVudHM6IDExLjEsIDExLjIsIDExLjMsIDExLjVcbiAqL1xuZXhwb3J0IGNvbnN0IEVycm9yRGlzcGxheTogUmVhY3QuRkM8RXJyb3JEaXNwbGF5UHJvcHM+ID0gKHtcbiAgZXJyb3IsXG4gIGVycm9yVHlwZSxcbiAgb25SZXRyeSxcbiAgb25GYWxsYmFja1xufSkgPT4ge1xuICAvKipcbiAgICogR2V0IGljb24gYmFzZWQgb24gZXJyb3IgdHlwZVxuICAgKi9cbiAgY29uc3QgZ2V0RXJyb3JJY29uID0gKCk6IHN0cmluZyA9PiB7XG4gICAgc3dpdGNoIChlcnJvclR5cGUpIHtcbiAgICAgIGNhc2UgJ2Nvbm5lY3Rpb24nOlxuICAgICAgICByZXR1cm4gJ/CflIwnO1xuICAgICAgY2FzZSAnYXVkaW8nOlxuICAgICAgICByZXR1cm4gJ/CfjqQnO1xuICAgICAgY2FzZSAncGVybWlzc2lvbic6XG4gICAgICAgIHJldHVybiAn8J+Ukic7XG4gICAgICBjYXNlICduZXR3b3JrJzpcbiAgICAgICAgcmV0dXJuICfwn5OhJztcbiAgICAgIGNhc2UgJ3N1Ym1pc3Npb24nOlxuICAgICAgICByZXR1cm4gJ/Cfk6QnO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICfimqDvuI8nO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogR2V0IGVycm9yIHRpdGxlIGJhc2VkIG9uIGVycm9yIHR5cGVcbiAgICovXG4gIGNvbnN0IGdldEVycm9yVGl0bGUgPSAoKTogc3RyaW5nID0+IHtcbiAgICBzd2l0Y2ggKGVycm9yVHlwZSkge1xuICAgICAgY2FzZSAnY29ubmVjdGlvbic6XG4gICAgICAgIHJldHVybiAnQ29ubmVjdGlvbiBFcnJvcic7XG4gICAgICBjYXNlICdhdWRpbyc6XG4gICAgICAgIHJldHVybiAnQXVkaW8gRXJyb3InO1xuICAgICAgY2FzZSAncGVybWlzc2lvbic6XG4gICAgICAgIHJldHVybiAnUGVybWlzc2lvbiBSZXF1aXJlZCc7XG4gICAgICBjYXNlICduZXR3b3JrJzpcbiAgICAgICAgcmV0dXJuICdOZXR3b3JrIEVycm9yJztcbiAgICAgIGNhc2UgJ3N1Ym1pc3Npb24nOlxuICAgICAgICByZXR1cm4gJ1N1Ym1pc3Npb24gRXJyb3InO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuICdFcnJvcic7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgaWYgZXJyb3IgaXMgcmV0cnlhYmxlXG4gICAqL1xuICBjb25zdCBpc1JldHJ5YWJsZSA9ICgpOiBib29sZWFuID0+IHtcbiAgICByZXR1cm4gZXJyb3JUeXBlICE9PSAncGVybWlzc2lvbicgJiYgb25SZXRyeSAhPT0gdW5kZWZpbmVkO1xuICB9O1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJlcnJvci1kaXNwbGF5XCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImVycm9yLWRpc3BsYXktaWNvblwiIHJvbGU9XCJpbWdcIiBhcmlhLWxhYmVsPXtnZXRFcnJvclRpdGxlKCl9PlxuICAgICAgICB7Z2V0RXJyb3JJY29uKCl9XG4gICAgICA8L2Rpdj5cbiAgICAgIFxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJlcnJvci1kaXNwbGF5LWNvbnRlbnRcIj5cbiAgICAgICAgPGgzIGNsYXNzTmFtZT1cImVycm9yLWRpc3BsYXktdGl0bGVcIj57Z2V0RXJyb3JUaXRsZSgpfTwvaDM+XG4gICAgICAgIDxwIGNsYXNzTmFtZT1cImVycm9yLWRpc3BsYXktbWVzc2FnZVwiPntlcnJvcn08L3A+XG4gICAgICAgIFxuICAgICAgICB7ZXJyb3JUeXBlID09PSAncGVybWlzc2lvbicgJiYgKFxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZXJyb3ItZGlzcGxheS1oZWxwXCI+XG4gICAgICAgICAgICA8cD5UbyB1c2Ugdm9pY2UgY2xhaW0gc3VibWlzc2lvbiwgcGxlYXNlOjwvcD5cbiAgICAgICAgICAgIDxvbD5cbiAgICAgICAgICAgICAgPGxpPkNsaWNrIHRoZSBtaWNyb3Bob25lIGljb24gaW4geW91ciBicm93c2VyJ3MgYWRkcmVzcyBiYXI8L2xpPlxuICAgICAgICAgICAgICA8bGk+U2VsZWN0IFwiQWxsb3dcIiB0byBncmFudCBtaWNyb3Bob25lIGFjY2VzczwvbGk+XG4gICAgICAgICAgICAgIDxsaT5SZWZyZXNoIHRoZSBwYWdlIGFuZCB0cnkgYWdhaW48L2xpPlxuICAgICAgICAgICAgPC9vbD5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgKX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImVycm9yLWRpc3BsYXktYWN0aW9uc1wiPlxuICAgICAgICB7aXNSZXRyeWFibGUoKSAmJiAoXG4gICAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICAgIGNsYXNzTmFtZT1cImJ0bi1lcnJvci1yZXRyeVwiXG4gICAgICAgICAgICBvbkNsaWNrPXtvblJldHJ5fVxuICAgICAgICAgICAgYXJpYS1sYWJlbD1cIlRyeSBhZ2FpblwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAg8J+UhCBUcnkgQWdhaW5cbiAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgKX1cbiAgICAgICAgPGJ1dHRvbiBcbiAgICAgICAgICBjbGFzc05hbWU9XCJidG4tZXJyb3ItZmFsbGJhY2tcIlxuICAgICAgICAgIG9uQ2xpY2s9e29uRmFsbGJhY2t9XG4gICAgICAgICAgYXJpYS1sYWJlbD1cIlVzZSBmb3JtLWJhc2VkIGlucHV0IGluc3RlYWRcIlxuICAgICAgICA+XG4gICAgICAgICAg8J+TnSBVc2UgRm9ybSBJbnN0ZWFkXG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59O1xuIl19