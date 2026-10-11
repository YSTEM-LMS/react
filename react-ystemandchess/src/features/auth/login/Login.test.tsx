import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import Login from './Login';

// mock window location
beforeEach(() => {
  delete window.location;
  window.location = {
    pathname: '',
    assign: jest.fn(), // in case other code uses it
  } as any;
});

// unit test on page load
test('renders the login page', async () => {
  render(<Login/>);
  const loginText = screen.getByText(/Login/i);
  expect(loginText).toBeInTheDocument();
  const enterText = screen.getByText(/Enter/i);
  expect(enterText).toBeInTheDocument();
  const forgotText = screen.getByText(/Forgot password?/i);
  expect(forgotText).toBeInTheDocument();
});

// unit test on short username
test('invalid username', async () => {
  render(<Login/>);
  
  // type in short username
  const userInput = screen.getByPlaceholderText('Username');
  await userEvent.type(userInput, 'n');
  expect(userInput).toHaveValue('n');

  // type in password
  const pwInput = screen.getByPlaceholderText('Password');
  await userEvent.type(pwInput, '123456789');
  expect(pwInput).toHaveValue('123456789');

  // confirm info
  const enterBtn = screen.getByText(/Enter/i);
  expect(enterBtn).toBeInTheDocument();
  fireEvent.click(enterBtn);

  // renders invalid username error
  const invalid = screen.getByText(/Invalid username or password/i);
  expect(invalid).toBeInTheDocument();
});

// unit test on short password
test('invalid password', async () => {
  render(<Login/>);
  
  // type in username
  const userInput = screen.getByPlaceholderText('Username');
  await userEvent.type(userInput, 'username');
  expect(userInput).toHaveValue('username');

  // type in short password
  const pwInput = screen.getByPlaceholderText('Password');
  await userEvent.type(pwInput, '123');
  expect(pwInput).toHaveValue('123');

  // confirm info
  const enterBtn = screen.getByText(/Enter/i);
  expect(enterBtn).toBeInTheDocument();
  fireEvent.click(enterBtn);

  // renders invalid password error
  const invalid = screen.getByText(/Invalid username or password/i);
  expect(invalid).toBeInTheDocument();
});

// unit test on incorrect credentials
test('incorrect credentials', async () => {
  render(<Login/>);

  // mock XHR object
  const mockXHR = {
    open: jest.fn(),
    setRequestHeader: jest.fn(),
    send: jest.fn(),
    readyState: 4,
    status: 400,
    responseText: null,
    onreadystatechange: null as (() => void) | null,
  };

  // When send is called, trigger onreadystatechange
  mockXHR.send.mockImplementation(() => {
    if (mockXHR.onreadystatechange) mockXHR.onreadystatechange();
  });
  
  // @ts-ignore: override global constructor
  global.XMLHttpRequest = jest.fn(() => mockXHR);

  // type in username
  const userInput = screen.getByPlaceholderText('Username');
  await userEvent.type(userInput, 'username');
  // type in password
  const pwInput = screen.getByPlaceholderText('Password');
  await userEvent.type(pwInput, '123456789');

  // confirm info
  const enterBtn = screen.getByText(/Enter/i);
  expect(enterBtn).toBeInTheDocument();
  fireEvent.click(enterBtn);

  // renders invalid password error
  const invalid = screen.getByText(/The username or password is incorrect./i);
  expect(invalid).toBeInTheDocument();
});

// unit test on correct credentials
test('correct credentials', async () => {
  render(<Login/>);

  const mockPayload = {
    'role': 'student' // mock using student role
  };
  const base64Payload = btoa(JSON.stringify(mockPayload));
  const fakeJWT = `header.${base64Payload}.signature`; // mock the jwt token

  // mock XHR object
  const mockXHR = {
    open: jest.fn(),
    setRequestHeader: jest.fn(),
    send: jest.fn(),
    readyState: 4,
    status: 200, // success status
    responseText: JSON.stringify({ token: fakeJWT }), // send the token
    onreadystatechange: null as (() => void) | null,
  };

  // When send is called, trigger onreadystatechange
  mockXHR.send.mockImplementation(() => {
    if (mockXHR.onreadystatechange) mockXHR.onreadystatechange();
  });
  
  // @ts-ignore: override global constructor
  global.XMLHttpRequest = jest.fn(() => mockXHR);

  // type in username
  const userInput = screen.getByPlaceholderText('Username');
  await userEvent.type(userInput, 'username');
  // type in password
  const pwInput = screen.getByPlaceholderText('Password');
  await userEvent.type(pwInput, '123456789');

  // confirm info
  const enterBtn = screen.getByText(/Enter/i);
  expect(enterBtn).toBeInTheDocument();
  fireEvent.click(enterBtn);

  // navigate to corresponding profile page
  expect(window.location.pathname).toBe('/student-profile');

  // /auth/login reads a JSON body; credentials must not be in the URL
  const [method, url] = mockXHR.open.mock.calls[0];
  expect(method).toBe('POST');
  expect(url).toMatch(/\/auth\/login$/);
  expect(url).not.toContain('123456789');
  expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
  expect(JSON.parse(mockXHR.send.mock.calls[0][0])).toEqual({ username: 'username', password: '123456789' });
});
