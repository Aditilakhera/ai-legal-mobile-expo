/**
 * AI Legal Mobile - Global Error Boundary
 * Catch-all React wrapper for runtime exception recovery screens.
 * Renders user-friendly maintenance, offline, or crash notification states.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, ScrollView, Platform } from 'react-native';
import { Button } from './buttons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[FATAL EXCEPTION] Caught by Error Boundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default themed recovery page
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              AI LEGAL encountered an unexpected runtime exception.
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorLog} contentContainerStyle={styles.logContent}>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.stackText}>{this.state.errorInfo.componentStack}</Text>
                )}
              </ScrollView>
            )}

            <View style={styles.actions}>
              <Button
                title="Try Again"
                variant="primary"
                onPress={this.handleReset}
                style={styles.btn}
              />
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A', // Sleek dark mode
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#151D30',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorLog: {
    maxHeight: 180,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
  },
  logContent: {
    paddingBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 8,
  },
  stackText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  actions: {
    alignItems: 'stretch',
  },
  btn: {
    alignSelf: 'stretch',
  },
});
