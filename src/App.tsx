import React, { useState, useMemo } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  Box,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  InputAdornment
} from '@mui/material';
import axios from 'axios';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import LinkIcon from '@mui/icons-material/Link';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

interface AnalyticsData {
  date: string;
  visitors: number;
  pageviews: number;
}

// 통계 데이터 타입
interface StatsData {
  totalVisits: number;
  visitsByDay: Record<string, number>;
  visitsByDayOfWeek: Record<number, number>;
  visitsByHour: Record<number, number>;
  // 기존 stats 호환을 위한 필드 추가
  totalVisitors?: number;
  totalPageviews?: number;
  avgVisitors?: number;
  avgPageviews?: number;
  maxVisitors?: number;
  maxVisitorsDate?: string;
  minVisitors?: number;
  minVisitorsDate?: string;
  avgWeekdayVisitors?: number;
  avgWeekendVisitors?: number;
  visitsByKeyword?: Record<string, number>;
}

function App() {
  const [url, setUrl] = useState('http://ifdo.co.kr/analytics/JSONAPI.apz?authkey=OU80MU9HRGJIcDFKUXRDMFY2QnkxaDFEd2g4YjJ2dHcyTDdNOCtEdVdhWT0%3D&m_enc=SnJhL2NvQXVaYVhBdHdUYzVXMURaNld5Wk0zQk5hWXpockRVTlMzbGlTdz0%3D');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData[]>([]);
  const [error, setError] = useState('');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [testMode, setTestMode] = useState(false);
  const [gptAnalysis, setGptAnalysis] = useState<string>('');
  const [gptLoading, setGptLoading] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [gptPrompt, setGptPrompt] = useState<string>('');
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);
  
  const fetchAnalytics = async () => {
    if (!url) {
      alert('API URL을 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setData([]);
    setApiResponse(null);
    try {
      const encodedUrl = encodeURIComponent(url);
      const proxyUrl = `/proxy-api?url=${encodedUrl}`;
      console.log('프록시 URL로 요청:', proxyUrl);
      
      const response = await axios.get(proxyUrl);
      console.log('응답 받음:', response.data);
      
      // 서버에서 제공한 데이터 처리 결과 확인
      if (response.data.error) {
        throw new Error(response.data.message || '데이터 로드 중 오류가 발생했습니다.');
      }
      
      if (response.data.data) {
        setApiResponse(response.data);
        
        // 데이터 파싱 상태 확인
        if (response.data.parsed) {
          console.log('서버에서 성공적으로 파싱된 데이터 사용');
        } else {
          console.log('서버에서 파싱되지 않은 원본 데이터 사용');
        }
        
        // 데이터 통계 업데이트
        updateDataStats(response.data.data);
      } else {
        throw new Error('응답에 데이터가 없습니다.');
      }
    } catch (error: any) {
      console.error('데이터 로드 오류:', error);
      setApiResponse(null);
      setError(error.message || '데이터 로드 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // GPT 분석 요청 함수
  const requestGptAnalysis = async (prompt: string) => {
    setGptLoading(true);
    setGptAnalysis('');
    
    try {
      // 분석할 데이터 준비
      const analyticsData = {
        stats: stats || {},
        chartData: data
      };
      
      // 로컬 서버에 분석 요청
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: analyticsData,
          prompt: prompt
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.message || '분석 중 오류가 발생했습니다.');
      }
      
      // 분석 결과 표시
      setGptAnalysis(responseData.analysis);
    } catch (error) {
      console.error('GPT 분석 요청 오류:', error);
      setGptAnalysis('');
      setError(`GPT 분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setGptLoading(false);
    }
  };

  // 서버에서 파싱된 데이터를 차트 데이터로 변환
  const convertToChartData = (data: any): AnalyticsData[] => {
    if (typeof data === 'string' || !data.data_content || !Array.isArray(data.data_content) || data.data_content.length === 0) {
      console.log('차트 데이터로 변환할 수 없는 형식:', data);
      return [];
    }
    
    console.log('데이터 변환 시작, 항목 수:', data.data_content.length);
    console.log('첫 번째 항목 샘플:', data.data_content[0]);
    
    // 날짜별 방문자 수 집계
    const dateVisits: Record<string, number> = {};
    
    data.data_content.forEach((item: any) => {
      // 날짜 필드가 "2"에 있음
      if (item['2']) {
        const date = item['2'];  // 형식: "2025-03-25"
        dateVisits[date] = (dateVisits[date] || 0) + 1;
      }
    });
    
    // 차트 데이터 형식으로 변환
    const chartData = Object.entries(dateVisits).map(([date, visitors]) => ({
      date,
      visitors,
      pageviews: visitors * 2 // 예상 페이지뷰 (방문자의 2배로 가정)
    }));
    
    // 날짜순 정렬
    chartData.sort((a, b) => a.date.localeCompare(b.date));
    
    console.log('변환된 차트 데이터:', chartData.length, '항목');
    return chartData;
  };

  // 데이터 통계 업데이트 함수
  const updateDataStats = (data: any) => {
    try {
      // 데이터 구조 확인
      if (typeof data === 'string') {
        console.log('문자열 데이터로, 통계를 계산할 수 없습니다.');
        return;
      }
      
      // 데이터가 적절한 형식인지 확인
      if (!data.data_content || !Array.isArray(data.data_content) || data.data_content.length === 0) {
        console.log('데이터 콘텐츠가 없거나 배열이 아닙니다.', data);
        return;
      }
      
      console.log('통계 계산 시작, 항목 수:', data.data_content.length);
      
      // 총 방문 수
      const totalVisits = data.data_content.length;
      
      // 날짜별 방문 수 (일별, 요일별)
      const visitsByDay: Record<string, number> = {};
      const visitsByDayOfWeek: Record<number, number> = {};
      
      // 시간별 방문 수
      const visitsByHour: Record<number, number> = {};
      
      // 검색어별 방문 수
      const visitsByKeyword: Record<string, number> = {};
      
      // 데이터 항목 순회
      data.data_content.forEach((item: any) => {
        // 날짜 추출 (2번 필드)
        if (item['2']) {
          const date = item['2'];  // "2025-03-25" 형식
          visitsByDay[date] = (visitsByDay[date] || 0) + 1;
          
          // 요일 계산
          const jsDate = new Date(date);
          const dayOfWeek = jsDate.getDay();
          visitsByDayOfWeek[dayOfWeek] = (visitsByDayOfWeek[dayOfWeek] || 0) + 1;
        }
        
        // 시간 추출 (3번 필드)
        if (item['3']) {
          const timeMatch = item['3'].match(/(\d{2}):/);
          if (timeMatch) {
            const hour = parseInt(timeMatch[1], 10);
            visitsByHour[hour] = (visitsByHour[hour] || 0) + 1;
          }
        }
        
        // 검색어 추출 (8번 필드)
        if (item['8']) {
          const keyword = item['8'].trim();
          if (keyword) {
            visitsByKeyword[keyword] = (visitsByKeyword[keyword] || 0) + 1;
          }
        }
      });
      
      // 데이터 정리 및 통계 설정
      setStats({
        totalVisits,
        visitsByDay,
        visitsByDayOfWeek,
        visitsByHour,
        visitsByKeyword
      } as any);
      
      console.log('통계 업데이트 완료:', {
        totalVisits,
        visitsByDay: Object.keys(visitsByDay).length,
        visitsByDayOfWeek: Object.keys(visitsByDayOfWeek).length,
        visitsByHour: Object.keys(visitsByHour).length,
        visitsByKeyword: Object.keys(visitsByKeyword).length
      });
    } catch (error) {
      console.error('통계 계산 오류:', error);
    }
  };

  // 샘플 데이터 생성 함수 (더 다양한 데이터)
  const generateSampleData = (): AnalyticsData[] => {
    // 현재 날짜로부터 30일치의 데이터 생성
    const result: AnalyticsData[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      
      // 주말에는 트래픽이 적게, 주중에는 트래픽이 많게 설정
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseVisitors = isWeekend ? 80 : 150;
      const basePageviews = isWeekend ? 230 : 450;
      
      // 약간의 랜덤 변동 추가
      const randomFactor = 0.8 + (Math.random() * 0.4); // 0.8 ~ 1.2 사이의 랜덤 계수
      
      result.push({
        date: dateStr,
        visitors: Math.round(baseVisitors * randomFactor),
        pageviews: Math.round(basePageviews * randomFactor)
      });
    }
    
    return result;
  };

  // API 응답 데이터 처리 함수
  const processApiResponse = (apiData: any): AnalyticsData[] => {
    console.log('API 데이터 처리 중:', apiData);
    
    if (!apiData) {
      console.warn('API 데이터가 없습니다.');
      return [];
    }

    try {
      // 텍스트 응답인 경우 확인
      if (typeof apiData === 'string') {
        console.log('문자열 데이터 처리 중...');
        
        // 일부 특수한 경우 처리 (예: "허용된 IP주소가 아닙니다." 메시지)
        if (apiData.includes('허용된 IP주소가 아닙니다')) {
          setError('API 서버 메시지: 허용된 IP주소가 아닙니다. 샘플 데이터를 표시합니다.');
          return [];
        }
        
        // JSON 파싱 시도
        try {
          console.log('JSON 문자열 파싱 시도...');
          const parsedData = JSON.parse(apiData);
          return processApiResponse(parsedData);
        } catch (e) {
          console.error('JSON 파싱 오류:', e);
          // JSON 파싱 실패 시 빈 배열 반환
          return [];
        }
      }

      // IFDO 로그 API 응답 형식 처리 (data_header)
      if (apiData.data_header && apiData.data_content) {
        console.log('IFDO API 형식 데이터 처리 중...');
        
        // 헤더 정보 분석 (열 번호와 의미 매핑)
        const headers: {[key: string]: string} = {};
        if (Array.isArray(apiData.data_header)) {
          apiData.data_header.forEach((headerItem: any) => {
            Object.entries(headerItem).forEach(([key, value]) => {
              headers[key] = value as string;
            });
          });
        }
        console.log('헤더 정보:', headers);
        
        // 날짜 열과 시간 열 번호 찾기
        const dateColumnIndex = Object.entries(headers)
          .find(([_, value]) => value === '날짜')?.[0];
        
        // 데이터 없을 경우 빈 배열 반환
        if (!dateColumnIndex || !Array.isArray(apiData.data_content)) {
          console.warn('데이터 형식이 올바르지 않습니다.');
          return [];
        }
        
        // 날짜별 방문자 수 집계하기
        const visitorsByDate: {[key: string]: number} = {};
        const pageviewsByDate: {[key: string]: number} = {};
        
        apiData.data_content.forEach((contentItem: any) => {
          let date = '';
          Object.entries(contentItem).forEach(([key, value]) => {
            if (key === dateColumnIndex) {
              date = value as string;
            }
          });
          
          if (date) {
            visitorsByDate[date] = (visitorsByDate[date] || 0) + 1;
            pageviewsByDate[date] = (pageviewsByDate[date] || 0) + 1;
          }
        });
        
        console.log('날짜별 방문자 수:', visitorsByDate);
        
        // 결과 배열 생성
        const result = Object.entries(visitorsByDate).map(([date, count]) => ({
          date,
          visitors: count,
          pageviews: pageviewsByDate[date] || count
        }));
        
        // 날짜순 정렬
        result.sort((a, b) => a.date.localeCompare(b.date));
        
        return result;
      }

      // 응답이 직접 배열인 경우
      if (Array.isArray(apiData)) {
        console.log('배열 데이터 처리 중...');
        // 배열이 비어있는 경우
        if (apiData.length === 0) {
          console.warn('API 응답 배열이 비어 있습니다.');
          return [];
        }
        
        // 배열의 첫 항목 확인
        const firstItem = apiData[0];
        console.log('배열 첫 항목:', firstItem);
        
        return apiData.map(item => ({
          date: item.date || item.Date || item.dt || item.날짜 || '날짜 없음',
          visitors: parseInt(String(item.visitors || item.Visitors || item.visitor_count || item.방문자 || 0)),
          pageviews: parseInt(String(item.pageviews || item.PageViews || item.pageview_count || item.페이지뷰 || 0))
        }));
      } 
      
      // 응답이 객체인 경우 - 가능한 여러 구조 처리
      if (typeof apiData === 'object') {
        console.log('객체 데이터 처리 중...');
        console.log('객체 키:', Object.keys(apiData));
        
        // 경우 1: 데이터가 중첩된 구조 (data, result, analytics 등의 키에 실제 데이터가 있는 경우)
        for (const key of ['data', 'result', 'results', 'analytics', 'stats', 'statistics']) {
          if (apiData[key]) {
            console.log(`'${key}' 키에서 데이터 발견`);
            return processApiResponse(apiData[key]);
          }
        }
        
        // 경우 2: 날짜 키가 있는 객체 구조
        const keys = Object.keys(apiData);
        // 날짜 형식 확인 (YYYY-MM-DD 또는 YYYYMMDD)
        // eslint-disable-next-line no-useless-escape
        const datePattern = /^\d{4}[-\/]?\d{2}[-\/]?\d{2}$|^\d{8}$/;
        const hasDateKeys = keys.some(key => datePattern.test(key));
        
        if (keys.length > 0 && hasDateKeys) {
          console.log('날짜 키 객체 구조 처리 중...');
          return keys.map(date => {
            const entry = apiData[date];
            // 객체인 경우 (예: {"2023-04-01": {visitors: 100, pageviews: 200}})
            if (typeof entry === 'object') {
              return {
                date,
                visitors: parseInt(String(entry.visitors || entry.Visitors || entry.visitor_count || entry.방문자 || 0)),
                pageviews: parseInt(String(entry.pageviews || entry.PageViews || entry.pageview_count || entry.페이지뷰 || 0))
              };
            } 
            // 숫자인 경우 (예: {"2023-04-01": 100}) - 방문자로 간주
            else if (typeof entry === 'number') {
              return {
                date,
                visitors: entry,
                pageviews: 0
              };
            }
            // 기본값
            return {
              date,
              visitors: 0,
              pageviews: 0
            };
          });
        }
        
        // 경우 3: visitors/pageviews 키가 있는 경우
        if (apiData.visitors || apiData.Visitors || apiData.pageviews || apiData.PageViews) {
          console.log('visitors/pageviews 키 구조 처리 중...');
          const visitorData = apiData.visitors || apiData.Visitors || {};
          const pageviewData = apiData.pageviews || apiData.PageViews || {};
          const allDates = Array.from(new Set([...Object.keys(visitorData), ...Object.keys(pageviewData)]));
          
          return allDates.map(date => ({
            date,
            visitors: parseInt(String(visitorData[date] || 0)),
            pageviews: parseInt(String(pageviewData[date] || 0))
          }));
        }
        
        // 경우 4: 완전히 평면화된 객체 (visitorsDay1, pageviewsDay1 등)
        const flatKeys = Object.keys(apiData);
        const visitorKeys = flatKeys.filter(k => k.includes('visitor') || k.includes('Visitor'));
        const pageviewKeys = flatKeys.filter(k => k.includes('pageview') || k.includes('Pageview') || k.includes('PageView'));
        
        if (visitorKeys.length > 0 || pageviewKeys.length > 0) {
          console.log('평면화된 객체 구조 처리 중...');
          // 날짜 생성 (현재로부터 과거 데이터 개수만큼)
          const dates = Array.from({ length: Math.max(visitorKeys.length, pageviewKeys.length) }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
          }).reverse(); // 과거에서 현재 순으로 정렬
          
          return dates.map((date, index) => ({
            date,
            visitors: parseInt(String(apiData[visitorKeys[index]] || 0)),
            pageviews: parseInt(String(apiData[pageviewKeys[index]] || 0))
          }));
        }
      }
      
      console.warn('알 수 없는 API 응답 형식:', apiData);
    } catch (e) {
      console.error('데이터 처리 중 오류:', e);
    }
    
    return [];
  };

  // 통계 계산
  const calculateChartStats = useMemo(() => {
    if (data.length === 0) return null;
    
    // 총 방문자 및 페이지뷰 계산
    const totalVisitors = data.reduce((sum, item) => sum + item.visitors, 0);
    const totalPageviews = data.reduce((sum, item) => sum + item.pageviews, 0);
    
    // 평균 계산
    const avgVisitors = Math.round(totalVisitors / data.length);
    const avgPageviews = Math.round(totalPageviews / data.length);
    
    // 최대/최소 계산
    const maxVisitors = Math.max(...data.map(item => item.visitors));
    const maxVisitorsDate = data.find(item => item.visitors === maxVisitors)?.date || '';
    
    const minVisitors = Math.min(...data.map(item => item.visitors));
    const minVisitorsDate = data.find(item => item.visitors === minVisitors)?.date || '';
    
    // 주중/주말 평균 계산
    const weekdayData = data.filter(item => {
      const date = new Date(item.date);
      const day = date.getDay();
      return day >= 1 && day <= 5; // 1(월) ~ 5(금)
    });
    
    const weekendData = data.filter(item => {
      const date = new Date(item.date);
      const day = date.getDay();
      return day === 0 || day === 6; // 0(일) 또는 6(토)
    });
    
    const avgWeekdayVisitors = weekdayData.length > 0 
      ? Math.round(weekdayData.reduce((sum, item) => sum + item.visitors, 0) / weekdayData.length)
      : 0;
      
    const avgWeekendVisitors = weekendData.length > 0
      ? Math.round(weekendData.reduce((sum, item) => sum + item.visitors, 0) / weekendData.length)
      : 0;
    
    // 추가 통계 데이터 (서버 통계와 통합)
    const visitsByDay = data.reduce((acc, item) => ({ ...acc, [item.date]: item.visitors }), {});
    const visitsByDayOfWeek = data.reduce((acc, item) => {
      const day = new Date(item.date).getDay();
      return { ...acc, [day]: (acc[day] || 0) + item.visitors };
    }, {} as Record<number, number>);
    
    const visitsByHour = data.reduce((acc, item) => {
      // 모든 데이터를 0시로 할당 (시간 정보가 없는 경우)
      return { ...acc, [0]: (acc[0] || 0) + item.visitors };
    }, {} as Record<number, number>);
    
    return {
      totalVisitors,
      totalPageviews,
      avgVisitors,
      avgPageviews,
      maxVisitors,
      maxVisitorsDate,
      minVisitors,
      minVisitorsDate,
      avgWeekdayVisitors,
      avgWeekendVisitors,
      // 서버 통계와 동일한 형식의 필드
      totalVisits: totalVisitors,
      visitsByDay, 
      visitsByDayOfWeek,
      visitsByHour
    } as StatsData;
  }, [data]);
  
  // 요일별 데이터 준비
  const dayOfWeekData = useMemo(() => {
    if (data.length === 0) return [];
    
    // 인덱스 시그니처를 추가하여 숫자 인덱스 사용 가능하게 함
    const dayMap: Record<number, { 
      name: string; 
      visitors: number; 
      pageviews: number; 
      count: number 
    }> = {
      0: { name: '일요일', visitors: 0, pageviews: 0, count: 0 },
      1: { name: '월요일', visitors: 0, pageviews: 0, count: 0 },
      2: { name: '화요일', visitors: 0, pageviews: 0, count: 0 },
      3: { name: '수요일', visitors: 0, pageviews: 0, count: 0 },
      4: { name: '목요일', visitors: 0, pageviews: 0, count: 0 },
      5: { name: '금요일', visitors: 0, pageviews: 0, count: 0 },
      6: { name: '토요일', visitors: 0, pageviews: 0, count: 0 }
    };
    
    data.forEach(item => {
      try {
        const date = new Date(item.date);
        const day = date.getDay();
        dayMap[day].visitors += item.visitors;
        dayMap[day].pageviews += item.pageviews;
        dayMap[day].count += 1;
      } catch (e) {
        console.error('날짜 파싱 오류:', e);
      }
    });
    
    return Object.values(dayMap).map(day => ({
      name: day.name,
      visitors: day.count > 0 ? Math.round(day.visitors / day.count) : 0,
      pageviews: day.count > 0 ? Math.round(day.pageviews / day.count) : 0
    }));
  }, [data]);

  // 프롬프트 다이얼로그 열기
  const handleOpenPromptDialog = () => {
    setGptPrompt('이 데이터에서 주목할만한 트렌드와 패턴을 분석해주세요.');
    setPromptDialogOpen(true);
  };

  // 프롬프트 다이얼로그 닫기
  const handleClosePromptDialog = () => {
    setPromptDialogOpen(false);
  };

  // 프롬프트로 분석 요청
  const handlePromptAnalysis = () => {
    setPromptDialogOpen(false);
    requestGptAnalysis(gptPrompt);
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 8 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2,
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: { xs: 2, sm: 3, md: 4 }
        }}
      >
        <Box 
          sx={{ 
            mb: 4,
            textAlign: 'center',
            p: 4,
            borderRadius: 3,
            background: 'linear-gradient(145deg, #3B4BDD 0%, #21D07B 100%)',
            color: 'white',
            boxShadow: '0 10px 20px rgba(59, 75, 221, 0.15)'
          }}
        >
          <Typography 
            variant="h4" 
            gutterBottom
            sx={{
              fontWeight: 800,
              textShadow: '0 2px 4px rgba(0,0,0,0.2)',
              mb: 1,
              color: 'white'
            }}
          >
            IFDO 리포트 API 분석
          </Typography>
          <Typography 
            variant="subtitle1"
            sx={{
              fontWeight: 500,
              opacity: 0.9,
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
              color: 'white'
            }}
          >
            방문 리포트 기반 GPT 인사이트 추출
          </Typography>
        </Box>

        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 2,
            background: 'white'
          }}
        >
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="API URL"
                variant="outlined"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://ifdo.co.kr/exe/web_visit_list.html"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  startIcon={<CloudDownloadIcon />}
                  onClick={fetchAnalytics}
                  disabled={loading}
                  sx={{ flex: 1 }}
                >
                  {loading ? '로딩 중...' : '데이터 로드'}
                </Button>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => {
                    setData(generateSampleData());
                    setApiResponse(null);
                    setTestMode(true);
                  }}
                  sx={{ flex: 1 }}
                >
                  테스트 모드
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PsychologyIcon />}
                onClick={handleOpenPromptDialog}
                disabled={loading || (!data.length && !testMode)}
                fullWidth
              >
                GPT 분석
              </Button>
            </Grid>
          </Grid>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Paper>

        {/* GPT 분석 결과 */}
        {gptLoading ? (
          <Paper 
            sx={{ 
              p: 4, 
              mb: 4, 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center', 
              minHeight: '300px',
              borderRadius: 2,
              background: 'linear-gradient(145deg, #f6f8fe 0%, #ffffff 100%)',
              boxShadow: 3
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <CircularProgress 
                sx={{ 
                  mb: 3,
                  color: 'primary.main'  
                }} 
              />
              <Typography 
                variant="h6"
                sx={{
                  fontWeight: 500,
                  color: 'text.primary'
                }}
              >
                GPT가 데이터를 분석하고 있습니다...
              </Typography>
              <Typography 
                variant="body2"
                sx={{
                  mt: 1,
                  color: 'text.secondary',
                  maxWidth: '600px'
                }}
              >
                풍부한 인사이트를 제공하기 위해 AI가 방문자 데이터를 심층 분석 중입니다.
                잠시만 기다려주세요.
              </Typography>
            </Box>
          </Paper>
        ) : gptAnalysis ? (
          <Paper 
            sx={{ 
              p: 0, 
              mb: 4, 
              overflow: 'hidden',
              borderRadius: 2,
              boxShadow: 3
            }}
          >
            <Box
              sx={{
                p: 3,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.2)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'white' }}>
                GPT 데이터 분석 결과
              </Typography>
            </Box>
            
            <Box 
              sx={{ 
                p: 4,
                bgcolor: '#ffffff',
                borderTop: '1px solid rgba(0,0,0,0.05)'
              }}
            >
              <Typography 
                variant="body1"
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.8,
                  color: 'text.primary',
                  fontWeight: 400,
                  '& strong': {
                    fontWeight: 600,
                    color: 'primary.main'
                  }
                }}
              >
                {gptAnalysis}
              </Typography>
            </Box>
          </Paper>
        ) : null}

        {data.length > 0 && (
          <>
            {/* 통계 요약 */}
            {(stats || calculateChartStats) && (
              <Paper 
                sx={{ 
                  p: 4, 
                  mb: 4, 
                  borderRadius: 2,
                  background: 'white',
                  boxShadow: 3
                }}
              >
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    '&::before': {
                      content: '""',
                      display: 'block',
                      width: 4,
                      height: 24,
                      bgcolor: 'primary.main',
                      mr: 2,
                      borderRadius: 1
                    }
                  }}
                >
                  방문 통계 요약
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6} lg={3}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: 2,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              bgcolor: 'primary.main',
                              mr: 1,
                              borderRadius: '50%'
                            }
                          }}
                        >
                          총 방문자 수
                        </Typography>
                        <Typography 
                          variant="h4" 
                          sx={{ 
                            fontWeight: 700,
                            color: 'text.primary'
                          }}
                        >
                          {(stats?.totalVisits || calculateChartStats?.totalVisitors || 0).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={3}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: 2,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              bgcolor: 'secondary.main',
                              mr: 1,
                              borderRadius: '50%'
                            }
                          }}
                        >
                          총 페이지뷰
                        </Typography>
                        <Typography 
                          variant="h4"
                          sx={{ 
                            fontWeight: 700,
                            color: 'text.primary'
                          }}
                        >
                          {(stats?.totalPageviews || calculateChartStats?.totalPageviews || 0).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={3}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: 2,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              bgcolor: '#FFB954',
                              mr: 1,
                              borderRadius: '50%'
                            }
                          }}
                        >
                          일평균 방문자
                        </Typography>
                        <Typography 
                          variant="h4"
                          sx={{ 
                            fontWeight: 700,
                            color: 'text.primary'
                          }}
                        >
                          {(stats?.avgVisitors || calculateChartStats?.avgVisitors || 0).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6} lg={3}>
                    <Card sx={{ 
                      borderRadius: 2, 
                      boxShadow: 2,
                      transition: 'transform 0.3s, box-shadow 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 4
                      }
                    }}>
                      <CardContent>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              bgcolor: '#FF5B5B',
                              mr: 1,
                              borderRadius: '50%'
                            }
                          }}
                        >
                          일평균 페이지뷰
                        </Typography>
                        <Typography 
                          variant="h4"
                          sx={{ 
                            fontWeight: 700,
                            color: 'text.primary'
                          }}
                        >
                          {(stats?.avgPageviews || calculateChartStats?.avgPageviews || 0).toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 4 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                      <CardContent>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              bgcolor: 'primary.main',
                              mr: 1,
                              borderRadius: '50%'
                            }
                          }}
                        >
                          최대 방문일
                        </Typography>
                        <Typography 
                          variant="h5"
                          sx={{ 
                            fontWeight: 600,
                            color: 'text.primary'
                          }}
                        >
                          {stats?.maxVisitorsDate || calculateChartStats?.maxVisitorsDate || ''}
                          {stats?.maxVisitors || calculateChartStats?.maxVisitors 
                            ? ` (${(stats?.maxVisitors || calculateChartStats?.maxVisitors || 0).toLocaleString()}명)` 
                            : ''}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                      <CardContent>
                        <Typography 
                          variant="subtitle2" 
                          sx={{ 
                            color: 'text.secondary',
                            mb: 1,
                            display: 'flex',
                            alignItems: 'center',
                            '&::before': {
                              content: '""',
                              display: 'inline-block',
                              width: 8,
                              height: 8,
                              bgcolor: 'secondary.main',
                              mr: 1,
                              borderRadius: '50%'
                            }
                          }}
                        >
                          주중/주말 평균
                        </Typography>
                        <Typography 
                          variant="h5"
                          sx={{ 
                            fontWeight: 600,
                            color: 'text.primary',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 2
                          }}
                        >
                          <Box 
                            sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              bgcolor: 'primary.light',
                              color: 'white',
                              px: 2,
                              py: 0.5,
                              borderRadius: 1
                            }}
                          >
                            주중: {(stats?.avgWeekdayVisitors || calculateChartStats?.avgWeekdayVisitors || 0).toLocaleString()}명
                          </Box>
                          <Box 
                            sx={{ 
                              display: 'flex',
                              alignItems: 'center',
                              bgcolor: 'secondary.light',
                              color: 'white',
                              px: 2,
                              py: 0.5,
                              borderRadius: 1
                            }}
                          >
                            주말: {(stats?.avgWeekendVisitors || calculateChartStats?.avgWeekendVisitors || 0).toLocaleString()}명
                          </Box>
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Paper>
            )}
            
            {/* 방문자 추이 차트 */}
            {data.length > 0 && (
              <Paper 
                sx={{ 
                  p: 4, 
                  mb: 4, 
                  borderRadius: 2,
                  background: 'white',
                  boxShadow: 3
                }}
              >
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    '&::before': {
                      content: '""',
                      display: 'block',
                      width: 4,
                      height: 24,
                      bgcolor: 'primary.main',
                      mr: 2,
                      borderRadius: 1
                    }
                  }}
                >
                  방문자 추이
                </Typography>
                
                <Box 
                  sx={{ 
                    borderRadius: 2, 
                    p: 2, 
                    bgcolor: '#f9fafc',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={data}
                      margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#6c757d' }} 
                        axisLine={{ stroke: '#dee2e6' }}
                      />
                      <YAxis 
                        tick={{ fill: '#6c757d' }} 
                        axisLine={{ stroke: '#dee2e6' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: 8,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          border: 'none'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: 20
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="visitors" 
                        stroke="#3B4BDD" 
                        name="방문자 수" 
                        strokeWidth={3}
                        dot={{ stroke: '#3B4BDD', strokeWidth: 2, r: 4, fill: 'white' }}
                        activeDot={{ r: 6, stroke: '#3B4BDD', strokeWidth: 1, fill: '#3B4BDD' }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="pageviews" 
                        stroke="#21D07B" 
                        name="페이지뷰" 
                        strokeWidth={3}
                        dot={{ stroke: '#21D07B', strokeWidth: 2, r: 4, fill: 'white' }}
                        activeDot={{ r: 6, stroke: '#21D07B', strokeWidth: 1, fill: '#21D07B' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            )}
            
            {/* 요일별 평균 방문자 차트 */}
            {dayOfWeekData.length > 0 && (
              <Paper 
                sx={{ 
                  p: 4, 
                  mb: 4, 
                  borderRadius: 2,
                  background: 'white',
                  boxShadow: 3
                }}
              >
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    '&::before': {
                      content: '""',
                      display: 'block',
                      width: 4,
                      height: 24,
                      bgcolor: 'primary.main',
                      mr: 2,
                      borderRadius: 1
                    }
                  }}
                >
                  요일별 평균 방문자
                </Typography>
                
                <Box 
                  sx={{ 
                    borderRadius: 2, 
                    p: 2, 
                    bgcolor: '#f9fafc',
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={dayOfWeekData}
                      margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#eaecef" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#6c757d' }} 
                        axisLine={{ stroke: '#dee2e6' }}
                      />
                      <YAxis 
                        tick={{ fill: '#6c757d' }} 
                        axisLine={{ stroke: '#dee2e6' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          borderRadius: 8,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                          border: 'none'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ 
                          paddingTop: 20
                        }}
                      />
                      <Bar 
                        dataKey="visitors" 
                        name="방문자 수" 
                        radius={[4, 4, 0, 0]}
                        fill="#3B4BDD"
                        barSize={36}
                      />
                      <Bar 
                        dataKey="pageviews" 
                        name="페이지뷰" 
                        radius={[4, 4, 0, 0]}
                        fill="#21D07B" 
                        barSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            )}
            
            {/* 서버에서 제공한 통계 데이터 시각화 */}
            {stats && (
              <>
                {/* 요일별 방문 통계 */}
                {Object.keys(stats.visitsByDayOfWeek).length > 0 && (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      mb: 4, 
                      borderRadius: 2,
                      background: 'white',
                      boxShadow: 3
                    }}
                  >
                    <Typography 
                      variant="h5" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 3,
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        '&::before': {
                          content: '""',
                          display: 'block',
                          width: 4,
                          height: 24,
                          bgcolor: 'primary.main',
                          mr: 2,
                          borderRadius: 1
                        }
                      }}
                    >
                      IFDO 요일별 방문 통계
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        borderRadius: 2, 
                        p: 2, 
                        bgcolor: '#f9fafc',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <ResponsiveContainer width="100%" height={350}>
                        <BarChart
                          data={[
                            { name: '일요일', 방문수: stats.visitsByDayOfWeek[0] || 0 },
                            { name: '월요일', 방문수: stats.visitsByDayOfWeek[1] || 0 },
                            { name: '화요일', 방문수: stats.visitsByDayOfWeek[2] || 0 },
                            { name: '수요일', 방문수: stats.visitsByDayOfWeek[3] || 0 },
                            { name: '목요일', 방문수: stats.visitsByDayOfWeek[4] || 0 },
                            { name: '금요일', 방문수: stats.visitsByDayOfWeek[5] || 0 },
                            { name: '토요일', 방문수: stats.visitsByDayOfWeek[6] || 0 }
                          ]}
                          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#eaecef" />
                          <XAxis 
                            dataKey="name" 
                            tick={{ fill: '#6c757d' }} 
                            axisLine={{ stroke: '#dee2e6' }}
                          />
                          <YAxis 
                            tick={{ fill: '#6c757d' }} 
                            axisLine={{ stroke: '#dee2e6' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              borderRadius: 8,
                              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                              border: 'none'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ 
                              paddingTop: 20
                            }}
                          />
                          <Bar 
                            dataKey="방문수" 
                            fill="url(#colorGradient)" 
                            name="방문 수"
                            radius={[4, 4, 0, 0]}
                            barSize={40}
                          />
                          <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B4BDD" stopOpacity={0.8}/>
                              <stop offset="100%" stopColor="#3B4BDD" stopOpacity={0.4}/>
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                )}
                
                {/* 시간별 방문 통계 */}
                {Object.keys(stats.visitsByHour).length > 0 && (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      mb: 4, 
                      borderRadius: 2,
                      background: 'white',
                      boxShadow: 3
                    }}
                  >
                    <Typography 
                      variant="h5" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 3,
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        '&::before': {
                          content: '""',
                          display: 'block',
                          width: 4,
                          height: 24,
                          bgcolor: 'primary.main',
                          mr: 2,
                          borderRadius: 1
                        }
                      }}
                    >
                      IFDO 시간별 방문 통계
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        borderRadius: 2, 
                        p: 2, 
                        bgcolor: '#f9fafc',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <ResponsiveContainer width="100%" height={350}>
                        <AreaChart
                          data={Array.from({ length: 24 }, (_, i) => ({
                            hour: `${i}시`,
                            방문수: stats.visitsByHour[i] || 0
                          }))}
                          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#eaecef" />
                          <XAxis 
                            dataKey="hour" 
                            tick={{ fill: '#6c757d' }} 
                            axisLine={{ stroke: '#dee2e6' }}
                          />
                          <YAxis 
                            tick={{ fill: '#6c757d' }} 
                            axisLine={{ stroke: '#dee2e6' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              borderRadius: 8,
                              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                              border: 'none'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ 
                              paddingTop: 20
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="방문수" 
                            stroke="#21D07B" 
                            fill="url(#colorHourGradient)" 
                            strokeWidth={2}
                            name="방문 수" 
                          />
                          <defs>
                            <linearGradient id="colorHourGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#21D07B" stopOpacity={0.8}/>
                              <stop offset="100%" stopColor="#21D07B" stopOpacity={0.1}/>
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                )}

                {/* 검색어 통계 */}
                {stats.visitsByKeyword && Object.keys(stats.visitsByKeyword).length > 0 && (
                  <Paper 
                    sx={{ 
                      p: 4, 
                      mb: 4, 
                      borderRadius: 2,
                      background: 'white',
                      boxShadow: 3
                    }}
                  >
                    <Typography 
                      variant="h5" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 700, 
                        mb: 3,
                        pb: 2,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        '&::before': {
                          content: '""',
                          display: 'block',
                          width: 4,
                          height: 24,
                          bgcolor: 'primary.main',
                          mr: 2,
                          borderRadius: 1
                        }
                      }}
                    >
                      IFDO 검색어 통계 (상위 10개)
                    </Typography>
                    
                    <Box 
                      sx={{ 
                        borderRadius: 2, 
                        p: 2, 
                        bgcolor: '#f9fafc',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart
                          layout="vertical"
                          data={Object.entries(stats.visitsByKeyword)
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 10)
                            .map(([keyword, count]) => ({
                              keyword,
                              count
                            }))}
                          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#eaecef" horizontal={false} />
                          <XAxis 
                            type="number" 
                            tick={{ fill: '#6c757d' }} 
                            axisLine={{ stroke: '#dee2e6' }}
                          />
                          <YAxis 
                            type="category" 
                            dataKey="keyword" 
                            width={100} 
                            tick={{ fill: '#6c757d' }} 
                            axisLine={{ stroke: '#dee2e6' }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              borderRadius: 8,
                              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                              border: 'none'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ 
                              paddingTop: 20
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            name="검색 횟수" 
                            radius={[0, 4, 4, 0]}
                            fill="url(#colorKeywordGradient)"
                            barSize={28}
                            label={{ 
                              position: 'right', 
                              formatter: (value: number) => value,
                              fill: '#6c757d',
                              fontSize: 12
                            }}
                          />
                          <defs>
                            <linearGradient id="colorKeywordGradient" x1="0" y1="0" x2="1" y2="0">
                              <stop offset="0%" stopColor="#3B4BDD" stopOpacity={0.9}/>
                              <stop offset="100%" stopColor="#21D07B" stopOpacity={0.9}/>
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Paper>
                )}
              </>
            )}
          </>
        )}
        
        {apiResponse && (
          <>
            <Paper 
              sx={{ 
                p: 4, 
                mt: 3, 
                mb: 4,
                borderRadius: 2,
                background: 'white',
                boxShadow: 3
              }}
            >
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3,
                  pb: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  '&::before': {
                    content: '""',
                    display: 'block',
                    width: 4,
                    height: 24,
                    bgcolor: 'primary.main',
                    mr: 2,
                    borderRadius: 1
                  }
                }}
              >
                API 응답 원본
              </Typography>
              
              <Box 
                component="pre" 
                sx={{ 
                  p: 3, 
                  bgcolor: '#f8f9fa', 
                  borderRadius: 2,
                  overflow: 'auto',
                  maxHeight: '300px',
                  border: '1px solid',
                  borderColor: 'divider',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  fontFamily: '"Consolas", "Monaco", monospace'
                }}
              >
                {JSON.stringify(apiResponse, null, 2)}
              </Box>
            </Paper>
            
            {/* 데이터 테이블 추가 */}
            {apiResponse.data && apiResponse.data.data_header && apiResponse.data.data_content && (
              <Paper 
                sx={{ 
                  p: 4, 
                  mt: 3, 
                  mb: 4,
                  borderRadius: 2,
                  background: 'white',
                  boxShadow: 3
                }}
              >
                <Typography 
                  variant="h5" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 700, 
                    mb: 3,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    '&::before': {
                      content: '""',
                      display: 'block',
                      width: 4,
                      height: 24,
                      bgcolor: 'primary.main',
                      mr: 2,
                      borderRadius: 1
                    }
                  }}
                >
                  방문 데이터 테이블
                </Typography>
                
                <Box 
                  sx={{ 
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden'
                  }}
                >
                  <TableContainer sx={{ maxHeight: 440 }}>
                    <DataTable 
                      headers={apiResponse.data.data_header} 
                      content={apiResponse.data.data_content}
                    />
                  </TableContainer>
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* GPT 분석 프롬프트 다이얼로그 */}
        <Dialog
          open={promptDialogOpen}
          onClose={handleClosePromptDialog}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: 24,
              overflow: 'hidden'
            }
          }}
        >
          <DialogTitle 
            sx={{ 
              bgcolor: 'primary.main',
              color: 'white',
              py: 2,
              px: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'rgba(255,255,255,0.2)'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'white' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </Box>
            <Typography variant="h6" fontWeight={700}>GPT 분석 프롬프트 입력</Typography>
          </DialogTitle>
          
          <DialogContent sx={{ py: 4, px: 3 }}>
            <DialogContentText sx={{ mb: 3, color: 'text.secondary' }}>
              분석에 사용할 프롬프트를 입력하세요. 이 프롬프트는 GPT에게 데이터 분석 지시를 주는 내용입니다.
            </DialogContentText>
            
            <TextField
              autoFocus
              margin="dense"
              label="분석 프롬프트"
              type="text"
              fullWidth
              multiline
              rows={6}
              value={gptPrompt}
              onChange={(e) => setGptPrompt(e.target.value)}
              variant="outlined"
              placeholder="예: 이 데이터에서 가장 많이 검색된 키워드 Top 5를 분석해주세요."
              sx={{ 
                mt: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1.5,
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: '2px'
                  }
                }
              }}
            />
            
            <Box sx={{ mt: 2, px: 2, py: 2, bgcolor: '#f8f9fa', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                프롬프트 예시:
              </Typography>
              <Typography variant="body2" component="div" sx={{ color: 'text.secondary' }}>
                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                  <li>이 데이터에서 가장 많이 검색된 키워드 Top 5를 분석해주세요.</li>
                  <li>방문자 트래픽이 가장 많은 요일과 시간대는 언제이며, 이를 어떻게 활용할 수 있을까요?</li>
                  <li>검색엔진별 유입 현황을 분석하고 마케팅 전략을 제안해주세요.</li>
                </ul>
              </Typography>
            </Box>
          </DialogContent>
          
          <DialogActions sx={{ px: 3, py: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
            <Button 
              onClick={handleClosePromptDialog} 
              color="inherit"
              sx={{ 
                fontWeight: 500,
                px: 3 
              }}
            >
              취소
            </Button>
            <Button 
              onClick={handlePromptAnalysis} 
              color="primary" 
              variant="contained"
              disabled={!gptPrompt.trim()}
              sx={{ 
                fontWeight: 500,
                px: 3,
                borderRadius: 1.5
              }}
            >
              분석 요청
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
  );
}

// 데이터 테이블 컴포넌트
interface DataTableProps {
  headers: Record<string, string>;
  content: Array<Record<string, string>>;
}

function DataTable({ headers, content }: DataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  // 헤더 키와 값의 매핑 생성
  const headerMap: Record<string, string> = {};
  Object.entries(headers).forEach(([key, value]) => {
    headerMap[key] = value;
  });

  // 테이블에 표시할 필드 선택 (모든 필드 표시)
  const fieldKeys = Object.keys(headerMap).sort((a, b) => Number(a) - Number(b));

  return (
    <>
      <Table stickyHeader aria-label="sticky table" size="small">
        <TableHead>
          <TableRow>
            {fieldKeys.map((key) => (
              <TableCell 
                key={key} 
                align="left"
                sx={{ 
                  fontWeight: 600, 
                  bgcolor: '#f5f7fa',
                  color: 'text.secondary',
                  whiteSpace: 'nowrap',
                  px: 2.5,
                  py: 2
                }}
              >
                {headerMap[key] || `필드 ${key}`}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {content
            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            .map((row, index) => {
              return (
                <TableRow 
                  hover 
                  role="checkbox" 
                  tabIndex={-1} 
                  key={index}
                  sx={{ 
                    '&:nth-of-type(even)': { 
                      bgcolor: 'rgba(0, 0, 0, 0.02)' 
                    }
                  }}
                >
                  {fieldKeys.map((key) => {
                    const value = row[key] || '';
                    return (
                      <TableCell 
                        key={key} 
                        align="left"
                        sx={{ 
                          px: 2.5,
                          py: 1.5,
                          fontSize: '0.875rem'
                        }}
                      >
                        {value}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={content.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="행 개수:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} / 전체 ${count}`}
        sx={{ 
          borderTop: '1px solid',
          borderColor: 'divider',
          '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
            fontWeight: 500,
            color: 'text.secondary'
          }
        }}
      />
    </>
  );
}

export default App; 