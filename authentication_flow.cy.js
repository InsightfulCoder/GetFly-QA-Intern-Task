/// <reference types="cypress" />

describe('Authentication Module Automation Suite', () => {

  // Pre-condition mapping: Establish environment variables and define structured test data payloads
  const testUser = {
    email: 'site_manager@constructionapp.com',
    password: 'SecurePassword123!'
  };

  beforeEach(() => {
    // Network Interception: Establish aliases to monitor backend HTTP responses during UI interaction
    cy.intercept('POST', '/api/v6.1/auth/login').as('loginRequest');
    
    // Command the browser instance to navigate to the application's root login endpoint
    cy.visit('/login');
  });

  it('TC-AUTH-01: Should successfully authenticate with valid credentials and navigate to the Dashboard', () => {
    // Assert structural visibility of the login interface
    cy.get('h1').contains('Login').should('be.visible');

    // Input target email data, explicitly clearing any existing DOM text to prevent pollution
    cy.get('input[name="email"]')
     .clear()
     .type(testUser.email)
     .should('have.value', testUser.email);
      
    // Input target password. The log: false flag ensures sensitive cryptographic data is masked in CI/CD runner logs
    cy.get('input[name="password"]')
     .clear()
     .type(testUser.password, { log: false }); 

    // Trigger the form submission sequence
    cy.get('button[type="submit"]').contains('Login').click();

    // Architectural synchronization: Await the specific backend API resolution rather than relying on static timeouts
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);

    // Validate the frontend routing transition to the protected dashboard
    cy.url().should('include', '/dashboard');
    cy.get('.header-title').contains('Project Overview').should('be.visible');
  });

  it('TC-AUTH-02: Should intercept invalid credentials and render the appropriate localized error UI', () => {
    // Inject invalid credential combinations
    cy.get('input[name="email"]').type(testUser.email);
    cy.get('input[name="password"]').type('CompromisedPassword!');
    cy.get('button[type="submit"]').click();

    // Verify the backend correctly rejects the unauthorized payload
    cy.wait('@loginRequest').its('response.statusCode').should('eq', 401);
    
    // Validate that the frontend error handling renders the required user feedback
    cy.get('.error-message')
     .should('be.visible')
     .and('contain.text', 'Incorrect password');
      
    // Ensure the routing engine blocks transition and maintains the user on the login interface
    cy.url().should('include', '/login');
  });

  it('TC-AUTH-11: Should execute a successful session teardown via the logout interface', () => {
    // State Injection: Perform a programmatic headless login to generate a token, bypassing UI friction to optimize test speed
    cy.request('POST', '/api/v6.1/auth/login', testUser)
     .then((response) => {
        // Inject the resulting JWT directly into the browser's local storage engine
        window.localStorage.setItem('authToken', response.body.token);
      });
      
    // Directly access a route protected by RBAC middleware
    cy.visit('/projects');
    cy.url().should('include', '/projects');

    // Execute the user-facing logout sequence
    cy.get('[data-testid="user-profile-menu"]').click();
    cy.contains('Logout').click();

    // Validate absolute session termination and local storage destruction
    cy.url().should('include', '/login');
    cy.window().its('localStorage.authToken').should('be.undefined');
  });
});