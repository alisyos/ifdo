// 환경 변수 로드
require('dotenv').config({ path: '.env.server' });

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// CORS 설정
app.use(cors());

// 정적 파일 서빙 설정 (React 빌드 파일)
app.use(express.static(path.join(__dirname, 'build')));

// API 프록시 엔드포인트
app.get('/proxy-api', async (req, res) => {
  try {
    const apiUrl = req.query.url;
    
    if (!apiUrl) {
      return res.status(400).json({ error: 'URL 파라미터가 필요합니다.' });
    }
    
    console.log('Proxying request to:', apiUrl);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      // 응답 데이터 타입을 명시적으로 설정
      responseType: 'text'
    });
    
    // 응답 상세 정보 로깅 (응답 유형 및 내용)
    console.log('API 응답 상태:', response.status);
    console.log('응답 타입:', typeof response.data);
    
    // 응답 내용 처리
    const responseText = response.data;
    console.log('전체 API 응답 내용:');
    console.log(responseText);
    console.log('=== API 응답 끝 ===');
    
    // 응답 형식 분석 정보
    const hasDataHeader = responseText.includes('data_header');
    const hasDataContent = responseText.includes('data_content');
    console.log('응답에 data_header 포함:', hasDataHeader);
    console.log('응답에 data_content 포함:', hasDataContent);
    
    // 수동으로 데이터 구조 생성 (샘플 데이터 형식으로)
    try {
      // 특별한 JSON 파싱 로직 시도
      const dataHeaders = {};
      const dataContents = [];
      
      // 헤더 정보 추출 시도
      const headerMatch = responseText.match(/{"data_header":\s*\[(.*?)\]/s);
      if (headerMatch && headerMatch[1]) {
        const headerText = headerMatch[1];
        const headerItems = headerText.match(/{"(\d+)":"([^"]+)"}/g);
        
        if (headerItems) {
          headerItems.forEach(item => {
            const match = item.match(/{"(\d+)":"([^"]+)"}/);
            if (match) {
              const key = match[1];
              const value = match[2];
              dataHeaders[key] = value;
            }
          });
        }
      }
      
      // 새로운 파싱 방법: 항목 번호와 배열 구조 찾기
      console.log('IFDO 특수 데이터 형식 파싱 시도...');
      
      // 모든 데이터 항목 검색 (예: {"334": [...], "335": [...] 등)
      const entryPattern = /{"(\d+)":\s*\[([\s\S]*?)\],\s*}/g;
      let entryMatch;
      
      let count = 0;
      while ((entryMatch = entryPattern.exec(responseText)) !== null) {
        if (entryMatch[1] && entryMatch[2]) {
          const itemId = entryMatch[1]; // 항목 번호 (334, 335 등)
          const itemContentStr = entryMatch[2]; // 항목 내용 (배열 내용)
          
          // 각 필드 추출 ({"1":"334. "}, {"2":"2025-03-25"} 등)
          const fieldsPattern = /{"(\d+)":"([^"]*)"}(?:,|\s*$)/g;
          let fieldMatch;
          
          const itemData = {};
          
          while ((fieldMatch = fieldsPattern.exec(itemContentStr)) !== null) {
            if (fieldMatch[1] && fieldMatch[2] !== undefined) {
              const fieldId = fieldMatch[1];
              const fieldValue = fieldMatch[2];
              itemData[fieldId] = fieldValue;
            }
          }
          
          // 충분한 필드가 있으면 데이터 추가
          if (Object.keys(itemData).length > 0) {
            dataContents.push(itemData);
            count++;
          }
        }
      }
      
      console.log(`IFDO 특수 형식 파싱 완료, ${count}개 항목 발견`);
      
      // 다른 방법으로도 시도
      if (count === 0) {
        console.log('대체 파싱 방법 시도...');
        
        // 각 항목 찾기 (번호와 배열)
        const itemPattern = /"(\d+)":\s*\[([\s\S]*?)\]/g;
        let itemMatch;
        
        while ((itemMatch = itemPattern.exec(responseText)) !== null) {
          if (itemMatch[1] && itemMatch[2]) {
            const itemId = itemMatch[1];
            const content = itemMatch[2];
            
            // 각 필드 찾기
            const fieldPattern = /{"(\d+)":"([^"]*)"}/g;
            let fieldMatch;
            
            const itemData = { id: itemId };
            
            while ((fieldMatch = fieldPattern.exec(content)) !== null) {
              if (fieldMatch[1] && fieldMatch[2] !== undefined) {
                itemData[fieldMatch[1]] = fieldMatch[2];
              }
            }
            
            if (Object.keys(itemData).length > 1) { // id 외에 하나 이상의 필드가 있어야 함
              dataContents.push(itemData);
            }
          }
        }
        
        console.log(`대체 파싱 방법으로 ${dataContents.length}개 항목 발견`);
      }
      
      // 마지막 방법: 날짜 데이터를 기준으로 파싱
      if (dataContents.length === 0) {
        console.log('최종 파싱 방법 시도: 날짜 데이터 검색');
        
        // 날짜 패턴 및 그 주변 데이터 찾기
        const datePattern = /{"2":"(\d{4}-\d{2}-\d{2})"}/g;
        let dateMatch;
        
        let dateItems = [];
        while ((dateMatch = datePattern.exec(responseText)) !== null) {
          if (dateMatch[1]) {
            const date = dateMatch[1];
            const pos = dateMatch.index;
            
            // 이 날짜를 포함하는 전체 항목 찾기
            // 날짜 주변 500자 검색
            const startPos = Math.max(0, pos - 100);
            const endPos = Math.min(responseText.length, pos + 400);
            const segment = responseText.substring(startPos, endPos);
            
            // 항목 전체 추출 시도
            const itemPattern = /"(\d+)":\s*\[([\s\S]*?)\],/;
            const itemMatch = segment.match(itemPattern);
            
            if (itemMatch && itemMatch[1] && itemMatch[2]) {
              const itemId = itemMatch[1];
              const itemContent = itemMatch[2];
              
              // 이 항목에서 모든 필드 추출
              const fieldPattern = /{"(\d+)":"([^"]*)"}/g;
              let fieldMatch;
              
              const itemData = { id: itemId };
              
              while ((fieldMatch = fieldPattern.exec(itemContent)) !== null) {
                if (fieldMatch[1] && fieldMatch[2] !== undefined) {
                  itemData[fieldMatch[1]] = fieldMatch[2];
                }
              }
              
              dateItems.push(itemData);
            }
          }
        }
        
        // 중복 제거 (ID 기준)
        const uniqueItems = {};
        dateItems.forEach(item => {
          if (item.id && !uniqueItems[item.id]) {
            uniqueItems[item.id] = item;
          }
        });
        
        // 데이터 추가
        dataContents.push(...Object.values(uniqueItems));
        console.log(`날짜 기반 파싱 방법으로 ${Object.keys(uniqueItems).length}개 항목 발견`);
      }
      
      // 최종 방법: 행 단위로 처리
      if (dataContents.length === 0) {
        console.log('마지막 시도: 행 단위 처리');
        
        const lines = responseText.split('\n');
        let currentItem = null;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // 새 항목 시작 확인 ({"123": 형식)
          if (line.match(/^{"(\d+)":/)) {
            // 이전 항목이 있으면 저장
            if (currentItem && Object.keys(currentItem).length > 0) {
              dataContents.push(currentItem);
            }
            
            const idMatch = line.match(/^{"(\d+)":/);
            if (idMatch && idMatch[1]) {
              currentItem = { id: idMatch[1] };
            } else {
              currentItem = {};
            }
          }
          // 필드 정보 찾기
          else if (currentItem && line.match(/^{"(\d+)":"([^"]*)"},?$/)) {
            const match = line.match(/^{"(\d+)":"([^"]*)"},?$/);
            if (match && match[1] && match[2] !== undefined) {
              currentItem[match[1]] = match[2];
            }
          }
        }
        
        // 마지막 항목 추가
        if (currentItem && Object.keys(currentItem).length > 0) {
          dataContents.push(currentItem);
        }
        
        console.log(`행 단위 처리로 ${dataContents.length}개 항목 발견`);
      }
      
      // 수동으로 파싱한 데이터 구조 생성
      const parsedData = {
        data_header: dataHeaders,
        data_content: dataContents
      };
      
      console.log('수동 파싱 결과: 헤더 키', Object.keys(dataHeaders).length);
      console.log('수동 파싱 결과: 콘텐츠 항목 수', dataContents.length);
      
      // 데이터 샘플 로깅 (첫 항목)
      if (dataContents.length > 0) {
        console.log('첫 번째 항목 샘플:', JSON.stringify(dataContents[0]));
      }
      
      // 성공적으로 파싱한 경우
      if (Object.keys(dataHeaders).length > 0 || dataContents.length > 0) {
        res.json({ 
          data: parsedData,
          status: response.status,
          statusText: response.statusText,
          responseType: 'object',
          parsed: true
        });
        return;
      }
    } catch (parseError) {
      console.error('수동 파싱 오류:', parseError.message);
    }
    
    // 모든 파싱 시도가 실패한 경우 원본 문자열 반환
    res.json({ 
      data: responseText,
      status: response.status,
      statusText: response.statusText,
      responseType: typeof responseText,
      parsed: false
    });
  } catch (error) {
    console.error('API 요청 오류:', error.message);
    
    // 에러 응답이 있으면 그대로 전달
    if (error.response) {
      console.log('에러 응답 상태:', error.response.status);
      console.log('에러 응답 데이터:', error.response.data);
      
      return res.status(200).json({ 
        error: true,
        status: error.response.status,
        data: error.response.data,
        message: `API 요청 실패: ${error.response.status}`
      });
    }
    
    // 일반 에러
    res.status(500).json({ 
      error: true,
      message: '서버 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// JSON 형식으로 수신된 데이터를 GPT에 전달하는 엔드포인트
app.post('/process-data', express.json({ limit: '10mb' }), (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: '데이터가 필요합니다.' });
    }
    
    console.log('데이터 처리 요청 수신. 데이터 크기:', JSON.stringify(data).length);
    
    // 여기서는 단순히 데이터를 추출하고 반환합니다.
    // 실제로는 여기서 데이터를 좀 더 처리할 수 있습니다.
    res.json({
      success: true,
      message: '데이터 처리 완료',
      processed_data: data
    });
  } catch (error) {
    console.error('데이터 처리 오류:', error);
    res.status(500).json({
      error: true,
      message: '데이터 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// OpenAI API 프록시 엔드포인트
app.post('/api/analyze', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { data, customPrompt } = req.body;
    
    if (!data) {
      return res.status(400).json({ error: '분석할 데이터가 필요합니다.' });
    }
    
    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API 키가 설정되지 않았습니다.' });
    }
    
    // 데이터 요약 (너무 큰 데이터는 잘라내기)
    let dataForAnalysis;
    if (typeof data === 'string') {
      // 문자열이면 앞부분만 사용
      dataForAnalysis = data.substring(0, 8000);
    } else {
      // 객체면 JSON으로 변환하여 사용
      dataForAnalysis = JSON.stringify(data).substring(0, 8000);
    }
    
    // 데이터 형식 분석 및 설명 추가
    let prompt = `다음은 웹사이트 방문 로그 데이터입니다.\n\n`;
    
    if (data.data_header && data.data_content) {
      prompt += `이 데이터는 다음과 같은 구조를 가지고 있습니다:\n`;
      prompt += `- 헤더: ${JSON.stringify(data.data_header)}\n`;
      prompt += `- 데이터 항목 수: ${data.data_content.length}개\n\n`;
      prompt += `각 항목의 예시: ${JSON.stringify(data.data_content[0])}\n\n`;
    }
    
    // 사용자 정의 프롬프트가 있으면 사용, 없으면 기본 프롬프트 사용
    if (customPrompt && customPrompt.trim()) {
      prompt += `${customPrompt.trim()}\n\n${dataForAnalysis}`;
    } else {
      prompt += `이 데이터를 분석하여 주요 트렌드, 패턴, 인사이트를 한국어로 요약해주세요:\n\n${dataForAnalysis}`;
    }
    
    console.log('분석 프롬프트:', customPrompt || '기본 프롬프트 사용');
    
    // OpenAI API 요청
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: '당신은 웹사이트 방문 데이터를 분석하는 데이터 분석가입니다. 주어진 데이터를 분석하고 인사이트를 제공해주세요.' 
          },
          { 
            role: 'user', 
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    // 응답에서 분석 텍스트 추출
    const analysisText = response.data.choices[0].message.content;
    
    res.json({ analysis: analysisText });
  } catch (error) {
    console.error('데이터 분석 오류:', error.message);
    res.status(500).json({
      error: true,
      message: '데이터 분석 중 오류가 발생했습니다.',
      details: error.message
    });
  }
});

// 모든 다른 GET 요청은 React 앱으로 라우팅
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
}); 