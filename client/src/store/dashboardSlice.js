import { createSlice } from '@reduxjs/toolkit';

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState: {
    stats: {
      totalStudents: 0,
      totalExams: 0,
      passingRate: 0,
      todayTests: 0,
      activeMentors: 0,
      newJobs: 0
    }
  },
  reducers: {
    setStats: (state, action) => {
      state.stats = action.payload;
    }
  }
});

export const { setStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;
