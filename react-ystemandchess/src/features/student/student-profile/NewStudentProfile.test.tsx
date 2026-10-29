import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useCookies } from 'react-cookie';
import { SetPermissionLevel } from '../../../globals';
import NewStudentProfile from './NewStudentProfile';

// ------------- MOCKS -------------
// mock react-cookie
jest.mock('react-cookie', () => ({
  __esModule: true,
  useCookies: jest.fn(),
}));

// mock globals (SetPermissionLevel)
jest.mock('../../../globals', () => ({
  __esModule: true,
  SetPermissionLevel: jest.fn(),
}));

// mock SweetAlert2 to avoid CSS parsing errors in jsdom
jest.mock('sweetalert2', () => {
  const mockSwal = {
    fire: jest.fn(() => Promise.resolve({ isConfirmed: true, isDenied: false, isDismissed: false })),
    mixin: jest.fn(),
    bindClickHandler: jest.fn(),
    stopTimer: jest.fn(),
    resumeTimer: jest.fn(),
    toggleTimer: jest.fn(),
    isTimerRunning: jest.fn(),
    incrementTimer: jest.fn(),
    showLoading: jest.fn(),
    hideLoading: jest.fn(),
    clickConfirm: jest.fn(),
    clickCancel: jest.fn(),
    clickDeny: jest.fn(),
    close: jest.fn(),
    enableButtons: jest.fn(),
    disableButtons: jest.fn(),
    showValidationMessage: jest.fn(),
    resetValidationMessage: jest.fn(),
    getInput: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockSwal,
  };
});

// mock the chart
jest.mock('react-chartjs-2', () => ({
  __esModule: true,
  Line: () => <div data-testid="mock-line-chart" />,
}));

// mock Puzzles component to avoid SweetAlert2 CSS parsing issues.
// Forwards the `student` prop onto the stub so tests can assert on it
// (React omits the data-student attribute entirely when the prop is
// undefined, so its presence/absence is directly observable).
jest.mock('../../puzzles/Puzzles', () => ({
  __esModule: true,
  default: (props: { student?: string }) => (
    <div data-testid="mock-puzzles" data-student={props.student} />
  ),
}));

// ------------- HELPER FUNCTIONS -------------

// helper to for date formatting to match with component
const formatEventDateTime = (iso: string) => {
  const dateObj = new Date(iso);
  return {
    date: dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    time: dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }),
  };
};

// render helper
const renderProfile = async () => {
  await act(async () =>
    render(
      <MemoryRouter>
        <NewStudentProfile />
      </MemoryRouter>
    )
  );
};
// before each test, reset and configure mocks
beforeEach(() => {
  // mock cookies hook
  (useCookies as jest.Mock).mockReturnValue([
    { login: 'dummy.jwt.token' },
    jest.fn(), // setCookie
    jest.fn(), // removeCookie
  ]);

  // mock SetPermissionLevel return
  (SetPermissionLevel as jest.Mock).mockResolvedValue({
    username: 'username',
    firstName: 'Mock',
    lastName: 'Name',
    error: false,
  });

  // mock fetch for all API calls
  global.fetch = jest.fn((url) => {
    if (url.includes('statistics')) {
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            username: 'username',
            mentor: 0,
            lesson: 5,
            play: 15,
            puzzle: 20,
            website: 10,
          }),
      });
    } else if (url.includes('latest')) {
      return Promise.resolve({
        json: () =>
          Promise.resolve([
            {
              startTime: '2025-06-10T02:44:27.781Z',
              eventName: 'mock event one',
              eventType: 'mock type',
            },
            {
              startTime: '2025-06-10T02:54:27.781Z',
              eventName: 'mock event two',
              eventType: 'another mock type',
            },
          ]),
      });
    } else if (url.includes('graph-data')) {
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            lesson: [{ monthText: 'Jan', timeSpent: 0 }],
            mentor: [{ monthText: 'Jan', timeSpent: 0 }],
            play: [{ monthText: 'Jan', timeSpent: 0 }],
            puzzle: [{ monthText: 'Jan', timeSpent: 0 }],
            website: [{ monthText: 'Jan', timeSpent: 0 }],
          }),
      });
    } else if (url.includes('getMentorship')) {
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            username: 'username',
            firstName: 'Mock',
            lastName: 'lastName',
          }),
      });
    }

    return Promise.reject(new Error('Unhandled fetch request: ' + url));
  }) as jest.Mock;
});

// clean up mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});

describe('NewStudentProfile', () => {
  test('renders the profile page', async () => {
    await renderProfile();

    // check if name is rendered correctly
    expect(await screen.findByText(/Hello Mock!/i)).toBeInTheDocument();

    // check if time spent is rendered
    expect(await screen.findByText(/Time Spent:/i)).toBeInTheDocument();

    // check if some of the tabs (by aria-label) are rendered
    expect(await screen.findByLabelText(/activity/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/games/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/mentor/i)).toBeInTheDocument();
  });

  test('renders time stats', async () => {
    await renderProfile();

    // wait for stats to load first
    await screen.findByText(/10 min/i);

    // check if stats for website browsing is rendered correctly
    const web_li = await screen.findByText(/Website:/i);
    expect(web_li).toBeInTheDocument();
    expect(web_li.firstElementChild).toHaveTextContent('10 min');

    // check if stats for playing is rendered correctly
    const play_li = await screen.findByText(/Playing:/i);
    expect(play_li).toBeInTheDocument();
    expect(play_li.firstElementChild).toHaveTextContent('15 min');
  });
    
  test('renders user activity', async () => {
    await renderProfile();
    
    const latestEvents = await global.fetch('latest').then(res => res.json());

    for (const event of latestEvents) {
      const { date, time } = formatEventDateTime(event.startTime);

      // check event name
      expect(await screen.findByText(new RegExp(event.eventName, 'i'))).toBeInTheDocument();

      // check formatted date and time
      const dates = await screen.findAllByText(date);
      expect(dates.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(time)).toBeInTheDocument();
    }
  });

  test('passes the student prop through when viewing your own profile', async () => {
    await renderProfile();

    const puzzlesTab = await screen.findByLabelText(/puzzles/i);
    await act(async () => puzzlesTab.click());

    const mockPuzzles = await screen.findByTestId('mock-puzzles');
    expect(mockPuzzles).toHaveAttribute('data-student', 'username');
  });

  test('omits the student prop when a parent views a different username via ?student=', async () => {
    // Logged-in user is the parent, not the profile being viewed.
    (SetPermissionLevel as jest.Mock).mockResolvedValue({
      username: 'parent_username',
      firstName: 'Mock',
      lastName: 'Name',
      error: false,
    });

    // The component reads window.location.search directly (not a router
    // hook), so MemoryRouter's initialEntries alone wouldn't reach it —
    // set the real jsdom URL via history.pushState instead.
    window.history.pushState({}, '', '/student-profile?student=someone_else');

    await act(async () =>
      render(
        <MemoryRouter>
          <NewStudentProfile />
        </MemoryRouter>
      )
    );

    const puzzlesTab = await screen.findByLabelText(/puzzles/i);
    await act(async () => puzzlesTab.click());

    const mockPuzzles = await screen.findByTestId('mock-puzzles');
    expect(mockPuzzles).not.toHaveAttribute('data-student');

    window.history.pushState({}, '', '/'); // reset so later tests see a clean URL
  });
});